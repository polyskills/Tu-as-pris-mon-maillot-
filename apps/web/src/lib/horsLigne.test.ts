import type { ArticleVoyage, Voyage } from '@maillot/domain';
import { describe, expect, it } from 'vitest';
import { ajouterALaFile, appliquerFile, PointageEnAttente, renommerDansFile } from './horsLigne';

const article = (id: string): ArticleVoyage => ({
  id,
  nom: id,
  categorie: 'vetements',
  proprietaire: 'lea',
  quantite: 1,
  statut: 'a-prendre',
  liste: 'valise',
  origine: 'catalogue',
});

const voyage = (id: string, articles: ArticleVoyage[]) => ({ id, articles }) as unknown as Voyage;

describe('file du pointage hors ligne', () => {
  it('regroupe les modifications d’un même article, la dernière valeur gagne', () => {
    let file: PointageEnAttente[] = [];
    file = ajouterALaFile(file, { voyageId: 'v', articleId: 'a', patch: { statut: 'dans-valise' } });
    file = ajouterALaFile(file, { voyageId: 'v', articleId: 'b', patch: { statut: 'dans-valise' } });
    file = ajouterALaFile(file, { voyageId: 'v', articleId: 'a', patch: { quantite: 3 } });
    file = ajouterALaFile(file, { voyageId: 'v', articleId: 'a', patch: { statut: 'a-prendre' } });
    expect(file).toEqual([
      { voyageId: 'v', articleId: 'a', patch: { statut: 'a-prendre', quantite: 3 } },
      { voyageId: 'v', articleId: 'b', patch: { statut: 'dans-valise' } },
    ]);
  });

  it('remplace l’entrée fusionnée par un nouvel objet (l’envoi en cours sait qu’elle a changé)', () => {
    const premiere = { voyageId: 'v', articleId: 'a', patch: { statut: 'dans-valise' as const } };
    const file = ajouterALaFile([premiere], { voyageId: 'v', articleId: 'a', patch: { statut: 'a-prendre' } });
    expect(file[0]).not.toBe(premiere);
  });

  it('ne mélange pas deux voyages', () => {
    const file = ajouterALaFile([{ voyageId: 'v1', articleId: 'a', patch: { statut: 'dans-valise' } }], {
      voyageId: 'v2',
      articleId: 'a',
      patch: { statut: 'pas-besoin' },
    });
    expect(file).toHaveLength(2);
  });

  it('renomme un article ajouté quand le serveur donne son identifiant définitif', () => {
    const file = renommerDansFile(
      [{ voyageId: 'v', articleId: 'ajout-provisoire', patch: { statut: 'dans-valise' } }],
      'v',
      'ajout-provisoire',
      'ajout-definitif',
    );
    expect(file[0].articleId).toBe('ajout-definitif');
  });

  it('réapplique la file sur les données du serveur', () => {
    const voyages = [voyage('v', [article('a'), article('b')]), voyage('w', [article('a')])];
    const file: PointageEnAttente[] = [
      { voyageId: 'v', articleId: 'a', patch: { statut: 'dans-valise', quantite: 2, liste: 'courses' } },
    ];
    const [v, w] = appliquerFile(voyages, file, 'moi@example.com');
    expect(v.articles[0]).toMatchObject({
      statut: 'dans-valise',
      pointePar: 'moi@example.com',
      quantite: 2,
      ajuste: true,
      liste: 'courses',
      listeChoisie: true,
    });
    expect(v.articles[1]).toBe(voyages[0].articles[1]);
    expect(w).toBe(voyages[1]);
  });
});
