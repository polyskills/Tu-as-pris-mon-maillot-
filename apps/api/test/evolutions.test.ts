import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { articlesEnService } from '../src/catalogue';
import { prisma } from '../src/db';
import { appliquerEvolutions } from '../src/evolutions';
import { viderBase } from './outils';

beforeAll(viderBase);
afterAll(() => prisma.$disconnect());

/** Catalogue en service tel qu'il était avant le motif Vacances / Travail (avec une retouche de l'équipe). */
async function ancienCatalogue() {
  const article = (id: string, nom: string, categorie: string, ordre: number, si: unknown, quantite?: unknown) => ({
    id,
    nom,
    categorie,
    portee: 'personne',
    ordre,
    si: si as object,
    ...(quantite !== undefined && { quantite: quantite as object }),
    majPar: 'catalogue de départ',
  });
  await prisma.catalogueArticle.createMany({
    data: [
      article('ordonnance', 'Ordonnance', 'papiers', 10, { habitudes: ['traitement'] }),
      article('pantalons', 'Pantalons / jeans', 'vetements', 20, [{ climats: ['tempere', 'froid'] }], {
        type: 'parJour',
        ratio: 0.3,
        plus: 1,
        max: 5,
      }),
      // Retouche de l'équipe (nuits minimum) : elle doit être gardée.
      article('veste-legere', 'Veste légère / coupe-vent', 'vetements', 30, {
        climats: ['chaud', 'tempere'],
        nuitsMin: 2,
      }),
      article('tenue-soiree', 'Tenue habillée', 'vetements', 40, { activites: ['soiree'] }),
      article('ordinateur', 'Ordinateur + chargeur', 'electronique', 50, { activites: ['travail'] }),
    ],
  });
}

describe('mise à jour du catalogue en service', () => {
  it('fait évoluer les règles existantes, une seule fois, avec une trace dans l’historique', async () => {
    await ancienCatalogue();
    expect(await appliquerEvolutions()).toBe(1);
    const parId = new Map((await articlesEnService()).map((a) => [a.id, a]));

    expect(parId.get('ordinateur')?.si).toEqual({ motifs: ['travail'] });
    expect(parId.get('veste-legere')?.si).toEqual({
      climats: ['chaud', 'tempere'],
      nuitsMin: 2,
      sauf: { motifs: ['travail'] },
    });
    expect(parId.get('pantalons')?.quantite).toEqual({ type: 'bas', coupe: 'long' });
    expect(parId.get('pantalons')?.si).toEqual([
      { climats: ['tempere', 'froid'] },
      { ages: ['enfant', 'ado', 'adulte', 'senior'], motifs: ['travail'] },
    ]);
    expect(parId.get('tenue-soiree')?.si).toEqual({ activites: ['soiree'] });

    // Nouveaux articles, placés après leur voisin.
    const ordres = await prisma.catalogueArticle.findMany({ orderBy: { ordre: 'asc' }, select: { id: true } });
    expect(ordres.map((a) => a.id)).toEqual([
      'ordonnance',
      'stylo-bloc',
      'pantalons',
      'veste-legere',
      'tenue-soiree',
      'costume',
      'ordinateur',
    ]);

    const historique = await prisma.catalogueHistorique.findMany({
      select: { articleId: true, action: true, auteur: true },
    });
    expect(historique.map((h) => `${h.articleId}:${h.action}`).sort()).toEqual([
      'costume:creation',
      'ordinateur:modification',
      'pantalons:modification',
      'stylo-bloc:creation',
      'veste-legere:modification',
    ]);
    expect(historique[0].auteur).toMatch(/^Mise à jour/);

    // Une seule fois.
    expect(await appliquerEvolutions()).toBe(0);
    expect(await prisma.catalogueHistorique.count()).toBe(5);
  });

  it('considère qu’une base neuve a déjà le catalogue à jour', async () => {
    await viderBase();
    expect(await appliquerEvolutions()).toBe(0);
    expect(await prisma.catalogueHistorique.count()).toBe(0);
    expect((await articlesEnService()).find((a) => a.id === 'stylo-bloc')).toBeDefined();
  });
});
