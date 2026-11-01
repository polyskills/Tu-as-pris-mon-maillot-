import { ArticleCatalogue, CATALOGUE_INITIAL, Condition, exclureMotif } from '@maillot/domain';
import { amorcer, colonnes, instantane, oublierCatalogue, versArticle } from './catalogue';
import { prisma } from './db';
import { EVOLUTIONS } from './evolutions-liste';
import type { Prisma } from './generated/prisma/client';

// Mises à jour du catalogue livrées avec le code. Le catalogue en service vit en base et l'équipe le modifie :
// on ne l'écrase pas, on fait évoluer les règles existantes, une seule fois (table catalogue_evolution), et chaque
// changement est inscrit dans l'historique comme une modification de l'administration.

type Tx = Prisma.TransactionClient;
type Si = ArticleCatalogue['si'];

interface Outils {
  /** Modifie un article s'il existe encore (rien sinon : l'équipe a pu le supprimer de fait en l'archivant). */
  modifier: (id: string, f: (a: ArticleCatalogue) => ArticleCatalogue) => Promise<void>;
  /** Crée un article du catalogue de départ s'il n'existe pas, juste après `apres` dans l'ordre. */
  creer: (id: string, apres: string) => Promise<void>;
}

const egal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** « Travail » était une activité ; c'est désormais un motif de voyage. */
function activiteTravailEnMotif(si: Si): Si {
  if (!si) return si;
  const convertir = (c: Condition): Condition[] => {
    const activites = (c.activites as string[] | undefined) ?? [];
    if (!activites.includes('travail')) return [c];
    const autres = activites.filter((x) => x !== 'travail') as Condition['activites'];
    const { activites: _a, ...reste } = c;
    void _a;
    const enTravail: Condition = { ...reste, motifs: ['travail'] };
    return autres?.length ? [{ ...c, activites: autres }, enTravail] : [enTravail];
  };
  const cas = (Array.isArray(si) ? si : [si]).flatMap(convertir);
  // Même forme qu'avant (liste ou cas unique) : pas de modification inutile dans l'historique.
  return Array.isArray(si) || cas.length > 1 ? cas : cas[0];
}

const EXCLUS_EN_TRAVAIL = [
  'veste-legere',
  'impermeable',
  'shorts',
  'shorts-f',
  'sandales',
  'casquette',
  'sac-a-dos',
  'glaciere',
  'ballon',
  'jeux-societe',
  'jumelles',
  'enceinte',
];

const MISES_A_JOUR: Record<(typeof EVOLUTIONS)[number], { auteur: string; appliquer: (o: Outils) => Promise<void> }> = {
  '2026-11-motif-travail': {
    auteur: 'Mise à jour : motif Vacances / Travail et bas partagés',
    async appliquer({ modifier, creer }) {
      // Toute règle qui parlait de l'activité « travail » passe au motif.
      for (const a of await prisma.catalogueArticle.findMany({ select: { id: true } })) {
        await modifier(a.id, (x) => ({ ...x, si: activiteTravailEnMotif(x.si) }));
      }
      // En travail : ni loisirs, ni plein air, ni vêtements de détente.
      for (const id of EXCLUS_EN_TRAVAIL) await modifier(id, (x) => ({ ...x, si: exclureMotif(x.si, 'travail') }));
      // Bas : un total partagé entre pantalons et shorts ; pantalons en travail, même au chaud.
      await modifier('pantalons', (x) => {
        const cas = x.si === undefined ? [] : Array.isArray(x.si) ? x.si : [x.si];
        const enTravail: Condition = { ages: ['enfant', 'ado', 'adulte', 'senior'], motifs: ['travail'] };
        return {
          ...x,
          quantite: { type: 'bas', coupe: 'long' },
          ...(x.si !== undefined && !cas.some((c) => egal(c, enTravail)) && { si: [...cas, enTravail] }),
        };
      });
      await modifier('shorts', (x) => ({ ...x, quantite: { type: 'bas', coupe: 'court' } }));
      await modifier('shorts-f', (x) => ({ ...x, quantite: { type: 'bas', coupe: 'court' } }));
      // Ce qui sert en déplacement professionnel.
      await creer('stylo-bloc', 'ordonnance');
      await creer('costume', 'tenue-soiree');
    },
  },
};

async function appliquerUne(id: (typeof EVOLUTIONS)[number]) {
  const { auteur, appliquer } = MISES_A_JOUR[id];
  await prisma.$transaction(
    async (tx: Tx) => {
      const outils: Outils = {
        async modifier(articleId, f) {
          const avant = await tx.catalogueArticle.findUnique({ where: { id: articleId } });
          if (!avant) return;
          const { id: _id, ...nouveau } = f(versArticle(avant));
          void _id;
          if (egal(versArticle(avant), { id: articleId, ...nouveau })) return;
          const apres = await tx.catalogueArticle.update({
            where: { id: articleId },
            data: { ...colonnes(nouveau), majPar: auteur },
          });
          await tx.catalogueHistorique.create({
            data: { articleId, action: 'modification', avant: instantane(avant), apres: instantane(apres), auteur },
          });
        },
        async creer(articleId, apres) {
          if (await tx.catalogueArticle.findUnique({ where: { id: articleId } })) return;
          const modele = CATALOGUE_INITIAL.find((a) => a.id === articleId);
          if (!modele) throw new Error(`Article ${articleId} absent du catalogue de départ`);
          const voisin = await tx.catalogueArticle.findUnique({ where: { id: apres } });
          const ordre = voisin
            ? voisin.ordre + 5
            : ((await tx.catalogueArticle.aggregate({ _max: { ordre: true } }))._max.ordre ?? 0) + 10;
          const { id: _id, ...donnees } = modele;
          void _id;
          const cree = await tx.catalogueArticle.create({
            data: { id: articleId, ordre, majPar: auteur, ...colonnes(donnees) },
          });
          await tx.catalogueHistorique.create({
            data: { articleId, action: 'creation', apres: instantane(cree), auteur },
          });
        },
      };
      // Les lectures de `appliquer` passent par prisma (hors transaction) : seulement des identifiants.
      await appliquer(outils);
      await tx.catalogueEvolution.create({ data: { id } });
    },
    { timeout: 60_000 },
  );
}

/**
 * Applique au catalogue en service les mises à jour pas encore appliquées. Renvoie leur nombre : s'il n'est pas nul,
 * les voyages à venir doivent être régénérés.
 */
export async function appliquerEvolutions(): Promise<number> {
  await amorcer();
  const faites = new Set((await prisma.catalogueEvolution.findMany({ select: { id: true } })).map((e) => e.id));
  let n = 0;
  for (const id of EVOLUTIONS) {
    if (faites.has(id)) continue;
    await appliquerUne(id);
    n++;
  }
  if (n) oublierCatalogue();
  return n;
}
