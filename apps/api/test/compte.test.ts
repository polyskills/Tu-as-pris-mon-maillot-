import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/db';
import { connecter, profil, viderBase, voyagePlage } from './outils';

type Agent = Awaited<ReturnType<typeof connecter>>;

beforeAll(viderBase);
afterAll(() => prisma.$disconnect());

/** Paul rejoint la famille d'Anne. */
async function partager(anne: Agent, paul: Agent, emailPaul: string) {
  await anne.post('/api/famille/invitations').send({ email: emailPaul }).expect(200);
  const [invitation] = (await paul.get('/api/moi').expect(200)).body.invitations;
  await paul.post(`/api/invitations/${invitation.id}/accepter`).expect(200);
}

describe('export des données', () => {
  it('renvoie le compte et toute la famille, en pièce jointe', async () => {
    const anne = await connecter('export@example.com');
    await anne
      .put('/api/profils/exp001')
      .send(profil('exp001', 'Anne', 1986))
      .expect(200);
    await anne
      .post('/api/voyages')
      .send(voyagePlage('expv01', ['exp001']))
      .expect(200);
    const res = await anne.get('/api/moi/export').expect(200);
    expect(res.headers['content-disposition']).toMatch(
      /attachment; filename="?tu-as-pris-mon-maillot-\d{4}-\d{2}-\d{2}\.json"?/,
    );
    expect(res.body.compte.email).toBe('export@example.com');
    expect(res.body.compte.sessions.length).toBeGreaterThan(0);
    expect(res.body.famille.membres).toEqual([
      { email: 'export@example.com', role: 'proprietaire', depuis: expect.any(String) },
    ]);
    expect(res.body.famille.profils[0].prenom).toBe('Anne');
    expect(res.body.famille.voyages[0].articles.length).toBeGreaterThan(0);
  });
});

describe('suppression du compte', () => {
  it('supprime le compte, sa famille et sa session', async () => {
    const seul = await connecter('seul@example.com');
    await seul
      .put('/api/profils/seul01')
      .send(profil('seul01', 'Solo', 1990))
      .expect(200);
    await seul
      .post('/api/voyages')
      .send(voyagePlage('seulv1', ['seul01']))
      .expect(200);
    await seul.delete('/api/moi').expect(204);
    await seul.get('/api/etat').expect(401);
    expect(await prisma.user.count({ where: { email: 'seul@example.com' } })).toBe(0);
    expect(await prisma.profil.count({ where: { id: 'seul01' } })).toBe(0);
    expect(await prisma.voyage.count({ where: { id: 'seulv1' } })).toBe(0);
  });

  it('laisse la famille partagée aux autres membres et efface son adresse du pointage', async () => {
    const anne = await connecter('anne-rgpd@example.com');
    const paul = await connecter('paul-rgpd@example.com');
    await anne
      .put('/api/profils/rgpd01')
      .send(profil('rgpd01', 'Anne', 1986))
      .expect(200);
    await anne
      .post('/api/voyages')
      .send(voyagePlage('rgpdv1', ['rgpd01']))
      .expect(200);
    await partager(anne, paul, 'paul-rgpd@example.com');
    await paul.patch('/api/voyages/rgpdv1/articles/rgpd01:maillot').send({ statut: 'dans-valise' }).expect(200);

    await paul.delete('/api/moi').expect(204);
    const etat = await anne.get('/api/etat').expect(200);
    const maillot = etat.body.voyages[0].articles.find((a: { id: string }) => a.id === 'rgpd01:maillot');
    expect(maillot.statut).toBe('dans-valise');
    expect(maillot).not.toHaveProperty('pointePar');
    const partage = await anne.get('/api/famille/partage').expect(200);
    expect(partage.body.membres.map((m: { email: string }) => m.email)).toEqual(['anne-rgpd@example.com']);
  });

  it('refuse tant que le compte gère une famille partagée', async () => {
    const anne = await connecter('anne-rgpd2@example.com');
    const paul = await connecter('paul-rgpd2@example.com');
    await partager(anne, paul, 'paul-rgpd2@example.com');
    await anne.delete('/api/moi').expect(409);
    await anne.post('/api/famille/membres/paul-rgpd2@example.com/proprietaire').expect(200);
    await anne.delete('/api/moi').expect(204);
    await paul.get('/api/famille/partage').expect(200);
  });

  it('retire les invitations reçues et envoyées', async () => {
    const anne = await connecter('anne-rgpd3@example.com');
    await anne.post('/api/famille/invitations').send({ email: 'invite-rgpd3@example.com' }).expect(200);
    const autre = await connecter('autre-rgpd3@example.com');
    await autre.post('/api/famille/invitations').send({ email: 'anne-rgpd3@example.com' }).expect(200);
    await anne.delete('/api/moi').expect(204);
    expect(await prisma.invitation.count({ where: { email: 'anne-rgpd3@example.com' } })).toBe(0);
    expect(await prisma.invitation.count({ where: { invitePar: 'anne-rgpd3@example.com' } })).toBe(0);
  });
});

describe('limite des invitations', () => {
  it('refuse au-delà de 20 invitations en attente, mais permet de renvoyer une invitation', async () => {
    const anne = await connecter('anne-limite@example.com');
    for (let i = 0; i < 20; i++) {
      await anne
        .post('/api/famille/invitations')
        .send({ email: `invite${i}@example.com` })
        .expect(200);
    }
    await anne.post('/api/famille/invitations').send({ email: 'invite20@example.com' }).expect(409);
    await anne.post('/api/famille/invitations').send({ email: 'invite3@example.com' }).expect(200);
  });
});
