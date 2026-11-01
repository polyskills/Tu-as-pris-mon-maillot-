import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/db';
import { app, connecter, profil, viderBase, voyagePlage } from './outils';

type Agent = Awaited<ReturnType<typeof connecter>>;
type Article = { id: string; nom: string; statut: string; proprietaire: string; origine: string; quantite: number };

beforeAll(viderBase);
afterAll(() => prisma.$disconnect());

describe('accès', () => {
  it('répond sur /api/sante sans connexion', async () => {
    await request(app).get('/api/sante').expect(200, { ok: true });
  });

  it('refuse les données sans connexion', async () => {
    const res = await request(app).get('/api/etat').expect(401);
    expect(res.body.erreur.code).toBe('non-connecte');
  });

  it('connecte par lien magique et crée la famille', async () => {
    const agent = await connecter('julie@example.com');
    const moi = await agent.get('/api/moi').expect(200);
    expect(moi.body.email).toBe('julie@example.com');
    await agent.get('/api/etat').expect(200, { profils: [], voyages: [] });
  });
});

describe('famille, voyage et pointage', () => {
  let julie: Agent;
  let articles: Article[];

  beforeAll(async () => {
    julie = await connecter('julie2@example.com');
  });

  it('enregistre des profils et refuse une habitude inconnue', async () => {
    await julie
      .put('/api/profils/papa1')
      .send(profil('papa1', 'Matthieu', 1985, { sexe: 'M' }))
      .expect(200);
    const res = await julie
      .put('/api/profils/lea01')
      .send(profil('lea01', 'Léa', 2018, { habitudes: ['doudou'] }))
      .expect(200);
    expect(res.body.profils.map((p: { prenom: string }) => p.prenom)).toEqual(['Matthieu', 'Léa']);

    const invalide = await julie
      .put('/api/profils/x0001')
      .send(profil('x0001', 'X', 1990, { habitudes: ['inconnue'] }));
    expect(invalide.status).toBe(400);
  });

  it('génère la liste à la création du voyage', async () => {
    const res = await julie
      .post('/api/voyages')
      .send(voyagePlage('voy001', ['papa1', 'lea01']))
      .expect(200);
    articles = res.body.articles;
    expect(articles.find((a) => a.id === 'lea01:maillot')?.nom).toBe('Maillot de bain');
    expect(articles.find((a) => a.id === 'lea01:doudou')).toBeDefined();
  });

  it('refuse un participant qui n’est pas de la famille', async () => {
    await julie
      .post('/api/voyages')
      .send(voyagePlage('voy002', ['inconnu']))
      .expect(404);
  });

  it('pointe un article et garde le pointage quand le voyage change', async () => {
    const pointe = await julie
      .patch('/api/voyages/voy001/articles/lea01:maillot')
      .send({ statut: 'dans-valise' })
      .expect(200);
    expect(pointe.body.statut).toBe('dans-valise');
    await julie.patch('/api/voyages/voy001/articles/papa1:sous-vetements').send({ quantite: 3 }).expect(200);

    const res = await julie
      .put('/api/voyages/voy001')
      .send({ ...voyagePlage('voy001', ['papa1', 'lea01']), nuits: 14 })
      .expect(200);
    const parId = new Map((res.body.articles as Article[]).map((a) => [a.id, a]));
    expect(parId.get('lea01:maillot')?.statut).toBe('dans-valise');
    expect(parId.get('papa1:sous-vetements')?.quantite).toBe(3);
  });

  it('met à jour les voyages quand un profil change', async () => {
    await julie
      .put('/api/profils/papa1')
      .send(profil('papa1', 'Matthieu', 1985, { habitudes: ['rasage'] }))
      .expect(200);
    const etat = await julie.get('/api/etat').expect(200);
    const ids = (etat.body.voyages[0].articles as Article[]).map((a) => a.id);
    expect(ids).toContain('papa1:rasoir');
    expect((etat.body.voyages[0].articles as Article[]).find((a) => a.id === 'lea01:maillot')?.statut).toBe(
      'dans-valise',
    );
  });

  it('ajoute et supprime un article, mais pas un article du catalogue', async () => {
    const ajout = await julie
      .post('/api/voyages/voy001/articles')
      .send({ nom: 'Cerf-volant', categorie: 'loisirs', proprietaire: 'commun' })
      .expect(200);
    await julie.delete(`/api/voyages/voy001/articles/${ajout.body.id}`).expect(204);
    await julie.delete('/api/voyages/voy001/articles/lea01:maillot').expect(404);
  });

  it('ajoute une suggestion calculée côté serveur', async () => {
    const ok = await julie.post('/api/voyages/voy001/suggestions/commun:enceinte').expect(200);
    expect(ok.body.origine).toBe('suggestion');
    await julie.post('/api/voyages/voy001/suggestions/commun:inexistant').expect(404);
  });

  it('retire un profil supprimé des participants', async () => {
    await julie.delete('/api/profils/lea01').expect(200);
    const etat = await julie.get('/api/etat').expect(200);
    expect(etat.body.voyages[0].participants).toEqual(['papa1']);
    expect((etat.body.voyages[0].articles as Article[]).some((a) => a.proprietaire === 'lea01')).toBe(false);
  });

  it('isole les familles entre elles', async () => {
    const autre = await connecter('intrus@example.com');
    await autre.get('/api/etat').expect(200, { profils: [], voyages: [] });
    await autre.patch('/api/voyages/voy001/articles/papa1:sous-vetements').send({ statut: 'pas-besoin' }).expect(404);
    await autre
      .put('/api/profils/moi01')
      .send(profil('moi01', 'Intrus', 1990))
      .expect(200);
    await autre
      .put('/api/voyages/voy001')
      .send(voyagePlage('voy001', ['moi01']))
      .expect(404);
    await autre
      .post('/api/voyages')
      .send(voyagePlage('voy003', ['papa1']))
      .expect(404);
    await autre.delete('/api/voyages/voy001').expect(404);
    await autre
      .put('/api/profils/papa1')
      .send(profil('papa1', 'Pirate', 1990))
      .expect(404);
    await autre.delete('/api/profils/papa1').expect(404);
  });
});

describe('reprise des données du navigateur', () => {
  const local = {
    profils: [profil('tom001', 'Tom', 2025, { habitudes: ['couches'] })],
    voyages: [
      {
        ...voyagePlage('voyloc', ['tom001']),
        creeLe: '2026-10-01T10:00:00.000Z',
        articles: [
          {
            id: 'tom001:couches',
            nom: 'Couches',
            categorie: 'bebe',
            proprietaire: 'tom001',
            quantite: 48,
            statut: 'dans-valise',
            liste: 'valise',
            origine: 'catalogue',
          },
        ],
      },
    ],
  };

  it('importe dans un compte vide, puis refuse un second import', async () => {
    const agent = await connecter('import@example.com');
    const res = await agent.post('/api/import').send(local).expect(200);
    expect(res.body.profils[0].prenom).toBe('Tom');
    const articles = res.body.voyages[0].articles as Article[];
    expect(articles.find((a) => a.id === 'tom001:couches')?.statut).toBe('dans-valise');
    // Liste complétée avec le catalogue actuel
    expect(articles.find((a) => a.id === 'tom001:bodies')).toBeDefined();
    await agent.post('/api/import').send(local).expect(409);
  });

  it('refuse d’importer des données déjà présentes sur un autre compte', async () => {
    const autre = await connecter('import2@example.com');
    await autre.post('/api/import').send(local).expect(409);
  });
});
