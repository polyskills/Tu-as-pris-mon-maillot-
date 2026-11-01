import { CATALOGUE_INITIAL } from '@maillot/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/db';
import { schemaArticleCatalogue } from '../src/validation';
import { connecter, profil, viderBase, voyagePlage } from './outils';

type Agent = Awaited<ReturnType<typeof connecter>>;
type Article = { id: string; nom: string; categorie: string; proprietaire: string };
type ArticleAdmin = Article & { archive: boolean };

/** Articles de chaque voyage du compte, par identifiant de voyage. */
async function voyagesDe(agent: Agent): Promise<Record<string, Article[]>> {
  const etat = await agent.get('/api/etat').expect(200);
  return Object.fromEntries(etat.body.voyages.map((v: { id: string; articles: Article[] }) => [v.id, v.articles]));
}

beforeAll(viderBase);
afterAll(() => prisma.$disconnect());

const cerfVolant = {
  nom: 'Cerf-volant de plage',
  categorie: 'loisirs',
  portee: 'commun',
  si: { destinations: ['plage'], sauf: { climats: ['froid'] } },
};

describe('catalogue en service', () => {
  it('chaque article du catalogue de départ respecte le format de l’administration', () => {
    for (const { id: _id, ...a } of CATALOGUE_INITIAL) {
      void _id;
      expect(() => schemaArticleCatalogue.parse(a), a.nom).not.toThrow();
    }
  });

  it('importe le catalogue de départ et le sert aux comptes connectés', async () => {
    const julie = await connecter('julie@example.com');
    const res = await julie.get('/api/catalogue').expect(200);
    expect(res.body.articles).toHaveLength(CATALOGUE_INITIAL.length);
    expect(res.body.articles[0]).toEqual(CATALOGUE_INITIAL[0]);
    expect(typeof res.body.version).toBe('string');
  });
});

describe('administration', () => {
  let admin: Agent;
  let julie: Agent;
  let editeur: Agent;

  beforeAll(async () => {
    admin = await connecter('admin@example.com');
    julie = await connecter('julie2@example.com');
    editeur = await connecter('editeur@example.com');
  });

  it('réserve l’administration à l’équipe', async () => {
    expect((await admin.get('/api/moi').expect(200)).body.role).toBe('admin');
    expect((await julie.get('/api/moi').expect(200)).body.role).toBeUndefined();
    const refus = await julie.get('/api/admin/catalogue').expect(403);
    expect(refus.body.erreur.code).toBe('interdit');
    await julie.post('/api/admin/catalogue').send(cerfVolant).expect(403);
  });

  it('crée un article avec un identifiant tiré du nom, utilisé à la génération', async () => {
    const cree = await admin.post('/api/admin/catalogue').send(cerfVolant).expect(200);
    expect(cree.body.id).toBe('cerf-volant-de-plage');
    expect(cree.body.majPar).toBe('admin@example.com');
    const doublon = await admin.post('/api/admin/catalogue').send(cerfVolant).expect(200);
    expect(doublon.body.id).toBe('cerf-volant-de-plage-2');
    await admin.post('/api/admin/catalogue/cerf-volant-de-plage-2/archiver').expect(200);

    const servi = await julie.get('/api/catalogue').expect(200);
    expect(servi.body.articles.map((a: Article) => a.id)).toContain('cerf-volant-de-plage');

    await julie
      .put('/api/profils/papa1')
      .send(profil('papa1', 'Matthieu', 1985))
      .expect(200);
    const voyage = await julie
      .post('/api/voyages')
      .send(voyagePlage('voy001', ['papa1']))
      .expect(200);
    expect(voyage.body.articles.find((a: Article) => a.id === 'commun:cerf-volant-de-plage')).toBeDefined();
    expect(voyage.body.articles.find((a: Article) => a.id === 'commun:cerf-volant-de-plage-2')).toBeUndefined();
  });

  it('refuse un article invalide', async () => {
    const invalides = [
      { ...cerfVolant, si: { destinations: ['lune'] } },
      { ...cerfVolant, si: { destinations: [] } },
      { ...cerfVolant, si: { sauf: { sauf: { climats: ['froid'] } } } },
      { ...cerfVolant, inconnu: true },
      { ...cerfVolant, quantite: { type: 'parJour' } },
      { ...cerfVolant, nom: ' ' },
    ];
    for (const corps of invalides) await admin.post('/api/admin/catalogue').send(corps).expect(400);
    await admin.put('/api/admin/catalogue/inexistant').send(cerfVolant).expect(404);
  });

  it('applique tout de suite les modifications aux voyages à venir, pas aux voyages passés', async () => {
    await julie
      .patch('/api/voyages/voy001/articles/commun:cerf-volant-de-plage')
      .send({ statut: 'dans-valise' })
      .expect(200);
    await julie
      .post('/api/voyages')
      .send({ ...voyagePlage('passe1', ['papa1']), depart: '2025-07-10' })
      .expect(200);

    const modifie = await admin
      .put('/api/admin/catalogue/cerf-volant-de-plage')
      .send({ ...cerfVolant, nom: 'Cerf-volant', quantite: { type: 'fixe', n: 2 }, si: [cerfVolant.si] })
      .expect(200);
    expect(modifie.body).toMatchObject({ id: 'cerf-volant-de-plage', nom: 'Cerf-volant', si: cerfVolant.si });
    expect(modifie.body.voyagesMisAJour).toBe(1);

    const voyages = await voyagesDe(julie);
    expect(voyages.voy001.find((a) => a.id === 'commun:cerf-volant-de-plage')).toMatchObject({
      nom: 'Cerf-volant',
      quantite: 2,
      statut: 'dans-valise',
    });
    expect(voyages.passe1.find((a) => a.id === 'commun:cerf-volant-de-plage')?.nom).toBe('Cerf-volant de plage');
  });

  it('archive et restaure, avec l’historique', async () => {
    await admin.post('/api/admin/catalogue/cerf-volant-de-plage/archiver').expect(200);
    await admin.post('/api/admin/catalogue/cerf-volant-de-plage/archiver').expect(409);
    const servi = await julie.get('/api/catalogue').expect(200);
    expect(servi.body.articles.map((a: Article) => a.id)).not.toContain('cerf-volant-de-plage');
    expect((await voyagesDe(julie)).voy001.some((a) => a.id === 'commun:cerf-volant-de-plage')).toBe(false);
    const tout = await admin.get('/api/admin/catalogue').expect(200);
    expect(tout.body.find((a: Article) => a.id === 'cerf-volant-de-plage').archive).toBe(true);

    await admin.post('/api/admin/catalogue/cerf-volant-de-plage/restaurer').expect(200);
    expect((await voyagesDe(julie)).voy001.some((a) => a.id === 'commun:cerf-volant-de-plage')).toBe(true);
    const histo = await admin.get('/api/admin/historique?article=cerf-volant-de-plage').expect(200);
    expect(histo.body.map((h: { action: string }) => h.action)).toEqual([
      'restauration',
      'archivage',
      'modification',
      'creation',
    ]);
    expect(histo.body[2].avant.nom).toBe('Cerf-volant de plage');
    expect(histo.body[2].apres.nom).toBe('Cerf-volant');
  });

  it('change l’ordre dans une catégorie, et les listes à venir suivent', async () => {
    const ordre = async () =>
      ((await admin.get('/api/admin/catalogue').expect(200)).body as ArticleAdmin[])
        .filter((a) => a.categorie === 'papiers' && !a.archive)
        .map((a) => a.id);
    const avant = await ordre();
    const res = await admin.post(`/api/admin/catalogue/${avant[2]}/deplacer`).send({ sens: 'haut' }).expect(200);
    expect(res.body.voyagesMisAJour).toBe(1);
    const apres = await ordre();
    expect(apres).toEqual([avant[0], avant[2], avant[1], ...avant.slice(3)]);

    await admin.post(`/api/admin/catalogue/${avant[0]}/deplacer`).send({ sens: 'haut' }).expect(200);
    expect(await ordre()).toEqual(apres);
    await admin.post(`/api/admin/catalogue/${avant[0]}/deplacer`).send({ sens: 'gauche' }).expect(400);
    await julie.post(`/api/admin/catalogue/${avant[0]}/deplacer`).send({ sens: 'bas' }).expect(403);

    const papiers = (await voyagesDe(julie)).voy001
      .filter((a) => a.categorie === 'papiers' && a.proprietaire === 'papa1')
      .map((a) => a.id.split(':')[1]);
    expect(papiers).toEqual(apres.filter((id) => papiers.includes(id)));
  });

  it('gère l’équipe : un éditeur modifie le catalogue, pas l’équipe', async () => {
    await editeur.get('/api/admin/catalogue').expect(403);
    await julie.put('/api/admin/equipe/editeur@example.com').send({ role: 'editeur' }).expect(403);
    const liste = await admin.put('/api/admin/equipe/Editeur@Example.com').send({ role: 'editeur' }).expect(200);
    expect(liste.body).toEqual([
      { email: 'admin@example.com', role: 'admin', fixe: true },
      { email: 'editeur@example.com', role: 'editeur', fixe: false, ajoutePar: 'admin@example.com' },
    ]);

    expect((await editeur.get('/api/moi').expect(200)).body.role).toBe('editeur');
    await editeur.get('/api/admin/catalogue').expect(200);
    await editeur.get('/api/admin/equipe').expect(403);

    await admin.put('/api/admin/equipe/pas-un-email').send({ role: 'editeur' }).expect(400);
    await admin.put('/api/admin/equipe/editeur@example.com').send({ role: 'chef' }).expect(400);
    await admin.delete('/api/admin/equipe/admin@example.com').expect(409);
    await admin.delete('/api/admin/equipe/editeur@example.com').expect(200);
    await editeur.get('/api/admin/catalogue').expect(403);
  });
});
