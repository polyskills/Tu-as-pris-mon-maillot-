import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/db';
import { abonnes } from '../src/evenements';
import { app, connecter, profil, viderBase } from './outils';

type Agent = Awaited<ReturnType<typeof connecter>>;

let serveur: Server;
let base: string;

beforeAll(async () => {
  await viderBase();
  serveur = app.listen(0);
  await new Promise((r) => serveur.once('listening', r));
  base = `http://127.0.0.1:${(serveur.address() as AddressInfo).port}`;
});
afterAll(async () => {
  serveur.closeAllConnections();
  await new Promise((r) => serveur.close(r));
  await prisma.$disconnect();
});

/** Cookie de session d'un client supertest, pour ouvrir le flux avec fetch. */
const cookie = (agent: Agent) =>
  (agent as unknown as { jar: { getCookies: (o: object) => { toValueString: () => string } } }).jar
    .getCookies({ domain: '127.0.0.1', path: '/', secure: false, script: false })
    .toValueString();

/** Ouvre le flux et renvoie une fonction qui attend le prochain événement « changement ». */
async function ecouter(agent: Agent) {
  const controle = new AbortController();
  const res = await fetch(`${base}/api/evenements`, { headers: { Cookie: cookie(agent) }, signal: controle.signal });
  expect(res.headers.get('content-type')).toContain('text/event-stream');
  const lecteur = res.body!.getReader();
  const decodeur = new TextDecoder();
  let tampon = '';
  const suivant = async (delai = 3000): Promise<{ origine?: string } | null> => {
    const limite = Date.now() + delai;
    for (;;) {
      const i = tampon.indexOf('event: changement\ndata: ');
      if (i >= 0) {
        const fin = tampon.indexOf('\n\n', i);
        if (fin >= 0) {
          const data = JSON.parse(tampon.slice(i + 'event: changement\ndata: '.length, fin));
          tampon = tampon.slice(fin + 2);
          return data;
        }
      }
      const reste = limite - Date.now();
      if (reste <= 0) return null;
      const lu = await Promise.race([lecteur.read(), new Promise<null>((r) => setTimeout(() => r(null), reste))]);
      if (!lu || lu.done) return null;
      tampon += decodeur.decode(lu.value);
    }
  };
  return { suivant, fermer: () => controle.abort() };
}

describe('événements en direct', () => {
  let anne: Agent;
  let paul: Agent;

  beforeAll(async () => {
    anne = await connecter('anne-sse@example.com');
    paul = await connecter('paul-sse@example.com');
    await anne.post('/api/famille/invitations').send({ email: 'paul-sse@example.com' }).expect(200);
    const [invitation] = (await paul.get('/api/moi').expect(200)).body.invitations;
    await paul.post(`/api/invitations/${invitation.id}/accepter`).expect(200);
  });

  it('refuse le flux sans connexion', async () => {
    const res = await fetch(`${base}/api/evenements`);
    expect(res.status).toBe(401);
  });

  it('prévient les autres appareils de la famille, avec l’onglet auteur', async () => {
    const flux = await ecouter(anne);
    await paul
      .put('/api/profils/paul02')
      .set('X-Onglet', 'onglet-paul')
      .send(profil('paul02', 'Paul', 1984));
    expect(await flux.suivant()).toEqual({ origine: 'onglet-paul' });
    flux.fermer();
  });

  it('ne prévient pas les autres familles', async () => {
    const intrus = await connecter('intrus-sse@example.com');
    const flux = await ecouter(intrus);
    await paul
      .put('/api/profils/paul02')
      .send(profil('paul02', 'Paul', 1985))
      .expect(200);
    expect(await flux.suivant(800)).toBeNull();
    flux.fermer();
  });

  it('libère l’abonnement à la fermeture', async () => {
    const familleId = (await anne.get('/api/moi').expect(200)).body.familleId;
    const flux = await ecouter(anne);
    expect(abonnes(familleId)).toBeGreaterThan(0);
    flux.fermer();
    await new Promise((r) => setTimeout(r, 100));
    expect(abonnes(familleId)).toBe(0);
  });
});
