import { ArticleCatalogue, CATALOGUE_INITIAL } from '@maillot/domain';
import { prisma } from './db';
import { env } from './env';
import { Prisma } from './generated/prisma/client';
import { Conflit, Introuvable } from './erreurs';
import { EVOLUTIONS } from './evolutions-liste';
import { schemaArticleCatalogue, schemaEmail, schemaEquipier, schemaSens } from './validation';

// Catalogue en service : en base, gardé en mémoire (un seul processus) et rechargé après chaque modification.
// Après chaque modification, les routes d'administration régénèrent les voyages à venir (donnees.regenererVoyagesAVenir).

type Ligne = Prisma.CatalogueArticleGetPayload<object>;
export type Role = 'admin' | 'editeur';

/** Article tel que vu dans l'administration. */
export interface ArticleAdmin extends ArticleCatalogue {
  archive: boolean;
  majLe: string;
  majPar?: string;
}

export const versArticle = (l: Ligne): ArticleCatalogue => ({
  id: l.id,
  nom: l.nom,
  categorie: l.categorie as ArticleCatalogue['categorie'],
  portee: l.portee as ArticleCatalogue['portee'],
  ...(l.si !== null && { si: l.si as unknown as ArticleCatalogue['si'] }),
  ...(l.quantite !== null && { quantite: l.quantite as unknown as ArticleCatalogue['quantite'] }),
  ...(l.mode && { mode: l.mode as ArticleCatalogue['mode'] }),
  ...(l.achetable && { achetable: true }),
});

const versAdmin = (l: Ligne): ArticleAdmin => ({
  ...versArticle(l),
  archive: l.archive,
  majLe: l.majLe.toISOString(),
  ...(l.majPar && { majPar: l.majPar }),
});

/** Valeur JSON facultative : null en base si absente. */
const jsonOuNull = (v: unknown) => (v === undefined || v === null ? Prisma.DbNull : (v as Prisma.InputJsonValue));

export const colonnes = (a: Omit<ArticleCatalogue, 'id'>) => ({
  nom: a.nom,
  categorie: a.categorie,
  portee: a.portee,
  mode: a.mode ?? null,
  achetable: a.achetable ?? false,
  si: jsonOuNull(a.si),
  quantite: jsonOuNull(a.quantite),
});

let cache: Promise<{ version: string; articles: ArticleCatalogue[] }> | undefined;

/**
 * Importe le catalogue de départ si la table est vide (premier démarrage, base neuve). Il contient déjà toutes les
 * mises à jour livrées avec le code : elles sont notées comme appliquées.
 */
export async function amorcer() {
  if (await prisma.catalogueArticle.count()) return;
  await prisma.catalogueEvolution.createMany({
    data: EVOLUTIONS.map((id) => ({ id })),
    skipDuplicates: true,
  });
  await prisma.catalogueArticle.createMany({
    data: CATALOGUE_INITIAL.map((a, i) => ({
      id: a.id,
      ordre: (i + 1) * 10,
      majPar: 'catalogue de départ',
      ...colonnes(a),
    })),
    skipDuplicates: true,
  });
}

async function lire() {
  await amorcer();
  const lignes = await prisma.catalogueArticle.findMany({ orderBy: [{ ordre: 'asc' }, { id: 'asc' }] });
  const derniere = lignes.reduce((max, l) => Math.max(max, l.majLe.getTime()), 0);
  return {
    version: `${lignes.length}-${derniere}`,
    articles: lignes.filter((l) => !l.archive).map(versArticle),
  };
}

/** Catalogue en service (articles non archivés), avec un numéro de version. */
export function catalogueEnService() {
  cache ??= lire().catch((e) => {
    cache = undefined;
    throw e;
  });
  return cache;
}

export const articlesEnService = async () => (await catalogueEnService()).articles;

/** À appeler après toute écriture dans le catalogue (et entre deux fichiers de tests). */
export function oublierCatalogue() {
  cache = undefined;
}

// --- Rôles ---

export async function roleDe(email: string): Promise<Role | undefined> {
  const e = email.toLowerCase();
  if (env.ADMIN_EMAILS.includes(e)) return 'admin';
  const equipier = await prisma.equipier.findUnique({ where: { email: e } });
  return equipier?.role as Role | undefined;
}

// --- Administration du catalogue ---

export async function listerAdmin() {
  await amorcer();
  const lignes = await prisma.catalogueArticle.findMany({ orderBy: [{ ordre: 'asc' }, { id: 'asc' }] });
  return lignes.map(versAdmin);
}

/** « Crème solaire (indice 50) » → « creme-solaire-indice-50 » */
export const identifiantDe = (nom: string) =>
  nom
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
    .replace(/-+$/, '') || 'article';

/** État enregistré dans l'historique (sans les dates). */
export const instantane = (l: Ligne) => {
  const { id: _id, ...reste } = versArticle(l);
  void _id;
  return { ...reste, archive: l.archive } as unknown as Prisma.InputJsonValue;
};

async function ligneDe(tx: Prisma.TransactionClient, id: string) {
  const ligne = await tx.catalogueArticle.findUnique({ where: { id } });
  if (!ligne) throw new Introuvable('Article introuvable');
  return ligne;
}

/** Retire les clés vides (null) envoyées par l'interface. */
function nettoyer(donnees: unknown): Omit<ArticleCatalogue, 'id'> {
  const a = schemaArticleCatalogue.parse(donnees);
  return {
    nom: a.nom,
    categorie: a.categorie,
    portee: a.portee,
    ...(a.mode && { mode: a.mode }),
    ...(a.achetable && { achetable: true }),
    ...(a.si && { si: Array.isArray(a.si) && a.si.length === 1 ? a.si[0] : a.si }),
    ...(a.quantite && { quantite: a.quantite }),
  } as Omit<ArticleCatalogue, 'id'>;
}

export async function creerArticle(auteur: string, donnees: unknown) {
  const article = nettoyer(donnees);
  const ligne = await prisma.$transaction(async (tx) => {
    const base = identifiantDe(article.nom);
    let id = base;
    for (let i = 2; await tx.catalogueArticle.findUnique({ where: { id } }); i++) id = `${base}-${i}`;
    const dernier = await tx.catalogueArticle.aggregate({ _max: { ordre: true } });
    const cree = await tx.catalogueArticle.create({
      data: { id, ordre: (dernier._max.ordre ?? 0) + 10, majPar: auteur, ...colonnes(article) },
    });
    await tx.catalogueHistorique.create({
      data: { articleId: id, action: 'creation', apres: instantane(cree), auteur },
    });
    return cree;
  });
  oublierCatalogue();
  return versAdmin(ligne);
}

export async function modifierArticle(auteur: string, id: string, donnees: unknown) {
  const article = nettoyer(donnees);
  const ligne = await prisma.$transaction(async (tx) => {
    const avant = await ligneDe(tx, id);
    const apres = await tx.catalogueArticle.update({ where: { id }, data: { ...colonnes(article), majPar: auteur } });
    await tx.catalogueHistorique.create({
      data: { articleId: id, action: 'modification', avant: instantane(avant), apres: instantane(apres), auteur },
    });
    return apres;
  });
  oublierCatalogue();
  return versAdmin(ligne);
}

/** Archiver retire l'article du catalogue en service ; restaurer l'y remet. Rien n'est effacé. */
export async function archiverArticle(auteur: string, id: string, archive: boolean) {
  const ligne = await prisma.$transaction(async (tx) => {
    const avant = await ligneDe(tx, id);
    if (avant.archive === archive) throw new Conflit(archive ? 'Article déjà archivé' : 'Article déjà en service');
    const apres = await tx.catalogueArticle.update({ where: { id }, data: { archive, majPar: auteur } });
    await tx.catalogueHistorique.create({
      data: {
        articleId: id,
        action: archive ? 'archivage' : 'restauration',
        avant: instantane(avant),
        apres: instantane(apres),
        auteur,
      },
    });
    return apres;
  });
  oublierCatalogue();
  return versAdmin(ligne);
}

/** Échange la place de l'article avec son voisin (même catégorie, en service). Renvoie le catalogue complet. */
export async function deplacerArticle(id: string, sens: unknown) {
  const s = schemaSens.parse(sens);
  await prisma.$transaction(async (tx) => {
    const article = await ligneDe(tx, id);
    if (article.archive) throw new Conflit('Article archivé');
    const voisin = await tx.catalogueArticle.findFirst({
      where: {
        categorie: article.categorie,
        archive: false,
        ordre: s === 'haut' ? { lt: article.ordre } : { gt: article.ordre },
      },
      orderBy: { ordre: s === 'haut' ? 'desc' : 'asc' },
    });
    if (!voisin) return;
    await tx.catalogueArticle.update({ where: { id: article.id }, data: { ordre: voisin.ordre } });
    await tx.catalogueArticle.update({ where: { id: voisin.id }, data: { ordre: article.ordre } });
  });
  oublierCatalogue();
  return listerAdmin();
}

export async function historique(articleId?: string) {
  const lignes = await prisma.catalogueHistorique.findMany({
    where: articleId ? { articleId } : {},
    orderBy: [{ date: 'desc' }, { id: 'desc' }],
    take: 200,
  });
  return lignes.map((l) => ({
    id: l.id,
    articleId: l.articleId,
    action: l.action,
    avant: l.avant,
    apres: l.apres,
    auteur: l.auteur,
    date: l.date.toISOString(),
  }));
}

// --- Équipe ---

export async function equipe() {
  const lignes = await prisma.equipier.findMany({ orderBy: { creeLe: 'asc' } });
  return [
    ...env.ADMIN_EMAILS.map((email) => ({ email, role: 'admin' as Role, fixe: true })),
    ...lignes
      .filter((l) => !env.ADMIN_EMAILS.includes(l.email))
      .map((l) => ({ email: l.email, role: l.role as Role, fixe: false, ajoutePar: l.ajoutePar })),
  ];
}

export async function enregistrerEquipier(auteur: string, email: unknown, donnees: unknown) {
  const e = schemaEmail.parse(email);
  const { role } = schemaEquipier.parse(donnees);
  if (env.ADMIN_EMAILS.includes(e)) throw new Conflit('Administrateur fixé par la configuration du serveur');
  await prisma.equipier.upsert({
    where: { email: e },
    create: { email: e, role, ajoutePar: auteur },
    update: { role },
  });
  return equipe();
}

export async function retirerEquipier(auteur: string, email: unknown) {
  const e = schemaEmail.parse(email);
  if (env.ADMIN_EMAILS.includes(e)) throw new Conflit('Administrateur fixé par la configuration du serveur');
  if (e === auteur.toLowerCase()) throw new Conflit('Impossible de se retirer soi-même');
  const { count } = await prisma.equipier.deleteMany({ where: { email: e } });
  if (!count) throw new Introuvable('Personne introuvable dans l’équipe');
  return equipe();
}
