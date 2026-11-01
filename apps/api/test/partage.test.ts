import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/db';
import { dernieresInvitations } from '../src/mail';
import { connecter, profil, viderBase, voyagePlage } from './outils';

type Agent = Awaited<ReturnType<typeof connecter>>;
type Article = { id: string; statut: string };

beforeAll(viderBase);
afterAll(() => prisma.$disconnect());

const invitationsDe = async (agent: Agent) =>
  (await agent.get('/api/moi').expect(200)).body.invitations as { id: string; invitePar: string; prenoms: string[] }[];

describe('partage de la famille', () => {
  let anne: Agent;
  let paul: Agent;

  beforeAll(async () => {
    anne = await connecter('anne@example.com');
    await anne
      .put('/api/profils/anne01')
      .send(profil('anne01', 'Anne', 1986))
      .expect(200);
    await anne
      .post('/api/voyages')
      .send(voyagePlage('voyag1', ['anne01']))
      .expect(200);
    // Paul a déjà commencé de son côté : son profil doit suivre quand il rejoint la famille d'Anne.
    paul = await connecter('paul@example.com');
    await paul
      .put('/api/profils/paul01')
      .send(profil('paul01', 'Paul', 1984))
      .expect(200);
  });

  it('montre la créatrice de la famille comme propriétaire', async () => {
    const res = await anne.get('/api/famille/partage').expect(200);
    expect(res.body).toEqual({
      monRole: 'proprietaire',
      membres: [{ email: 'anne@example.com', role: 'proprietaire', moi: true }],
      invitations: [],
    });
  });

  it('invite par e-mail et prévient la personne', async () => {
    await anne.post('/api/famille/invitations').send({ email: 'pas-une-adresse' }).expect(400);
    await anne.post('/api/famille/invitations').send({ email: 'anne@example.com' }).expect(409);
    const res = await anne.post('/api/famille/invitations').send({ email: ' Paul@Example.com ' }).expect(200);
    expect(res.body.invitations.map((i: { email: string }) => i.email)).toEqual(['paul@example.com']);
    expect(dernieresInvitations.get('paul@example.com')).toBe('anne@example.com');
  });

  it('montre l’invitation à la personne invitée, et à elle seule', async () => {
    const invitations = await invitationsDe(paul);
    expect(invitations).toEqual([{ id: expect.any(String), invitePar: 'anne@example.com', prenoms: ['Anne'] }]);
    const intrus = await connecter('intrus2@example.com');
    expect(await invitationsDe(intrus)).toEqual([]);
    await intrus.post(`/api/invitations/${invitations[0].id}/accepter`).expect(404);
  });

  it('rejoint la famille en y apportant ses profils', async () => {
    const [invitation] = await invitationsDe(paul);
    const res = await paul.post(`/api/invitations/${invitation.id}/accepter`).expect(200);
    expect(res.body.profils.map((p: { prenom: string }) => p.prenom).sort()).toEqual(['Anne', 'Paul']);
    expect(res.body.voyages.map((v: { id: string }) => v.id)).toEqual(['voyag1']);
    expect(await invitationsDe(paul)).toEqual([]);

    const partage = await anne.get('/api/famille/partage').expect(200);
    expect(partage.body.membres).toEqual([
      { email: 'anne@example.com', role: 'proprietaire', moi: true },
      { email: 'paul@example.com', role: 'membre', moi: false },
    ]);
    expect(partage.body.invitations).toEqual([]);
  });

  it('partage le pointage entre les membres', async () => {
    await paul.patch('/api/voyages/voyag1/articles/anne01:maillot').send({ statut: 'dans-valise' }).expect(200);
    const etat = await anne.get('/api/etat').expect(200);
    const maillot = (etat.body.voyages[0].articles as Article[]).find((a) => a.id === 'anne01:maillot');
    expect(maillot?.statut).toBe('dans-valise');
  });

  it('réserve les invitations et les retraits à la propriétaire', async () => {
    await paul.post('/api/famille/invitations').send({ email: 'ami@example.com' }).expect(403);
    await paul.delete('/api/famille/membres/anne@example.com').expect(403);
    await anne.post('/api/famille/quitter').expect(409);
  });

  it('annule une invitation en attente', async () => {
    await anne.post('/api/famille/invitations').send({ email: 'mamie@example.com' }).expect(200);
    const res = await anne.delete('/api/famille/invitations/mamie@example.com').expect(200);
    expect(res.body.invitations).toEqual([]);
    const mamie = await connecter('mamie@example.com');
    expect(await invitationsDe(mamie)).toEqual([]);
  });

  it('refuse une invitation', async () => {
    await anne.post('/api/famille/invitations').send({ email: 'tonton@example.com' }).expect(200);
    const tonton = await connecter('tonton@example.com');
    const [invitation] = await invitationsDe(tonton);
    await tonton.post(`/api/invitations/${invitation.id}/refuser`).expect(204);
    expect(await invitationsDe(tonton)).toEqual([]);
    const partage = await anne.get('/api/famille/partage').expect(200);
    expect(partage.body.invitations).toEqual([]);
  });

  it('laisse un membre quitter la famille : il repart d’une famille vide', async () => {
    const res = await paul.post('/api/famille/quitter').expect(200);
    expect(res.body).toEqual({ profils: [], voyages: [] });
    await paul.patch('/api/voyages/voyag1/articles/anne01:maillot').send({ statut: 'a-prendre' }).expect(404);
    // Le profil apporté par Paul reste dans la famille d'Anne.
    const etat = await anne.get('/api/etat').expect(200);
    expect(etat.body.profils.map((p: { prenom: string }) => p.prenom).sort()).toEqual(['Anne', 'Paul']);
  });

  it('retire un membre', async () => {
    await anne.post('/api/famille/invitations').send({ email: 'paul@example.com' }).expect(200);
    const [invitation] = await invitationsDe(paul);
    await paul.post(`/api/invitations/${invitation.id}/accepter`).expect(200);
    await anne.delete('/api/famille/membres/anne@example.com').expect(409);
    const res = await anne.delete('/api/famille/membres/paul@example.com').expect(200);
    expect(res.body.membres.map((m: { email: string }) => m.email)).toEqual(['anne@example.com']);
    await paul.get('/api/etat').expect(200, { profils: [], voyages: [] });
  });

  it('empêche la propriétaire d’une famille partagée d’en rejoindre une autre', async () => {
    await anne.post('/api/famille/invitations').send({ email: 'paul@example.com' }).expect(200);
    const [invitation] = await invitationsDe(paul);
    await paul.post(`/api/invitations/${invitation.id}/accepter`).expect(200);

    const autre = await connecter('autre@example.com');
    await autre.post('/api/famille/invitations').send({ email: 'anne@example.com' }).expect(200);
    const [pourAnne] = await invitationsDe(anne);
    await anne.post(`/api/invitations/${pourAnne.id}/accepter`).expect(409);
  });
});
