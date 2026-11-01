import {
  ArticleVoyage,
  CATALOGUE,
  COMMUN,
  fusionner,
  genererArticles,
  genererSuggestions,
  ParametresVoyage,
  Profil,
  Voyage,
} from '@maillot/domain';
import { z } from 'zod';
import { prisma } from './db';
import type { Prisma } from './generated/prisma/client';
import { schemaAjoutArticle, schemaImport, schemaMajArticle, schemaNouveauVoyage, schemaProfil } from './validation';

// Accès aux données d'une famille. Toutes les fonctions reçoivent l'identifiant de la famille du compte connecté :
// impossible de lire ou modifier les données d'une autre famille.

export class Introuvable extends Error {}
export class Conflit extends Error {}

type Tx = Prisma.TransactionClient;
/** Valeur stockée dans une colonne JSON. */
const json = (v: unknown) => v as Prisma.InputJsonValue;
type LigneProfil = Prisma.ProfilGetPayload<object>;
type LigneVoyage = Prisma.VoyageGetPayload<{ include: { articles: true } }>;
type LigneArticle = Prisma.ArticleVoyageGetPayload<object>;

// --- Conversion base ↔ moteur de règles ---

const versProfil = (l: LigneProfil): Profil => ({
  id: l.id,
  prenom: l.prenom,
  ...(l.couleur && { couleur: l.couleur }),
  anneeNaissance: l.anneeNaissance,
  ...(l.sexe && { sexe: l.sexe as Profil['sexe'] }),
  habitudes: l.habitudes as unknown as Profil['habitudes'],
  responsabilites: l.responsabilites as unknown as Profil['responsabilites'],
  articlesPerso: l.articlesPerso as unknown as Profil['articlesPerso'],
});

const versArticle = (l: LigneArticle): ArticleVoyage => ({
  id: l.id,
  nom: l.nom,
  categorie: l.categorie as ArticleVoyage['categorie'],
  proprietaire: l.proprietaire,
  quantite: l.quantite,
  statut: l.statut as ArticleVoyage['statut'],
  liste: l.liste as ArticleVoyage['liste'],
  origine: l.origine as ArticleVoyage['origine'],
  ...(l.ajuste && { ajuste: true }),
  ...(l.listeChoisie && { listeChoisie: true }),
  ...(l.achetable && { achetable: true }),
});

const versVoyage = (l: LigneVoyage): Voyage => ({
  id: l.id,
  creeLe: l.creeLe.toISOString(),
  nom: l.nom,
  depart: l.depart,
  nuits: l.nuits,
  destinations: l.destinations as unknown as Voyage['destinations'],
  climat: l.climat as Voyage['climat'],
  zone: l.zone as Voyage['zone'],
  transports: l.transports as unknown as Voyage['transports'],
  hebergement: l.hebergement as Voyage['hebergement'],
  machineALaver: l.machineALaver,
  activites: l.activites as unknown as Voyage['activites'],
  participants: l.participants as unknown as string[],
  articles: l.articles.map(versArticle),
});

const colonnesParametres = (p: ParametresVoyage) => ({
  nom: p.nom,
  depart: p.depart,
  nuits: p.nuits,
  destinations: json(p.destinations),
  climat: p.climat,
  zone: p.zone,
  transports: json(p.transports),
  hebergement: p.hebergement,
  machineALaver: p.machineALaver,
  activites: json(p.activites),
  participants: json(p.participants),
});

const colonnesArticle = (voyageId: string, a: ArticleVoyage) => ({
  voyageId,
  id: a.id,
  nom: a.nom,
  categorie: a.categorie,
  proprietaire: a.proprietaire,
  quantite: a.quantite,
  statut: a.statut,
  liste: a.liste,
  origine: a.origine,
  ajuste: a.ajuste ?? false,
  listeChoisie: a.listeChoisie ?? false,
  achetable: a.achetable ?? false,
});

async function remplacerArticles(tx: Tx, voyageId: string, articles: ArticleVoyage[]) {
  await tx.articleVoyage.deleteMany({ where: { voyageId } });
  if (articles.length) await tx.articleVoyage.createMany({ data: articles.map((a) => colonnesArticle(voyageId, a)) });
}

async function profilsDe(tx: Tx, familleId: string) {
  return (await tx.profil.findMany({ where: { familleId }, orderBy: { creeLe: 'asc' } })).map(versProfil);
}

async function voyageDe(tx: Tx, familleId: string, voyageId: string) {
  const ligne = await tx.voyage.findFirst({ where: { id: voyageId, familleId }, include: { articles: true } });
  if (!ligne) throw new Introuvable('Voyage introuvable');
  return versVoyage(ligne);
}

/** Les participants doivent appartenir à la famille. */
async function verifierParticipants(tx: Tx, familleId: string, participants: string[]) {
  const n = await tx.profil.count({ where: { familleId, id: { in: participants } } });
  if (n !== new Set(participants).size) throw new Introuvable('Participant inconnu');
}

// --- Famille du compte ---

/** Renvoie la famille du compte, créée à la première connexion. */
export async function familleDuCompte(userId: string): Promise<string> {
  const membre = await prisma.membre.findFirst({ where: { userId }, orderBy: { creeLe: 'asc' } });
  if (membre) return membre.familleId;
  const famille = await prisma.famille.create({ data: { membres: { create: { userId } } } });
  return famille.id;
}

export async function etat(familleId: string) {
  const [profils, voyages] = await Promise.all([
    profilsDe(prisma, familleId),
    prisma.voyage.findMany({ where: { familleId }, include: { articles: true }, orderBy: { creeLe: 'desc' } }),
  ]);
  return { profils, voyages: voyages.map(versVoyage) };
}

// --- Profils ---

/** Crée ou modifie un profil, puis met à jour les voyages auxquels il participe (sans perdre le pointage). */
export async function enregistrerProfil(familleId: string, donnees: unknown) {
  const p = schemaProfil.parse(donnees) as Profil;
  return prisma.$transaction(async (tx) => {
    const existant = await tx.profil.findUnique({ where: { id: p.id } });
    if (existant && existant.familleId !== familleId) throw new Introuvable('Profil introuvable');
    const colonnes = {
      prenom: p.prenom,
      couleur: p.couleur ?? null,
      anneeNaissance: p.anneeNaissance,
      sexe: p.sexe ?? null,
      habitudes: json(p.habitudes),
      responsabilites: json(p.responsabilites),
      articlesPerso: json(p.articlesPerso),
    };
    await tx.profil.upsert({ where: { id: p.id }, create: { id: p.id, familleId, ...colonnes }, update: colonnes });
    await regenererVoyagesDe(tx, familleId, (v) => v.participants.includes(p.id));
    return etatTx(tx, familleId);
  });
}

export async function supprimerProfil(familleId: string, profilId: string) {
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.profil.deleteMany({ where: { id: profilId, familleId } });
    if (!count) throw new Introuvable('Profil introuvable');
    await regenererVoyagesDe(
      tx,
      familleId,
      (v) => v.participants.includes(profilId),
      (v) => ({ ...v, participants: v.participants.filter((x) => x !== profilId) }),
    );
    return etatTx(tx, familleId);
  });
}

async function regenererVoyagesDe(
  tx: Tx,
  familleId: string,
  concerne: (v: Voyage) => boolean,
  transformer: (v: Voyage) => Voyage = (v) => v,
) {
  const profils = await profilsDe(tx, familleId);
  const lignes = await tx.voyage.findMany({ where: { familleId }, include: { articles: true } });
  for (const v of lignes.map(versVoyage).filter(concerne).map(transformer)) {
    const articles = fusionner(v.articles, genererArticles(v, profils, CATALOGUE), v.participants);
    await tx.voyage.update({ where: { id: v.id }, data: { participants: json(v.participants) } });
    await remplacerArticles(tx, v.id, articles);
  }
}

async function etatTx(tx: Tx, familleId: string) {
  const profils = await profilsDe(tx, familleId);
  const voyages = await tx.voyage.findMany({
    where: { familleId },
    include: { articles: true },
    orderBy: { creeLe: 'desc' },
  });
  return { profils, voyages: voyages.map(versVoyage) };
}

// --- Voyages ---

export async function creerVoyage(familleId: string, donnees: unknown) {
  const { id, ...params } = schemaNouveauVoyage.parse(donnees) as ParametresVoyage & { id: string };
  return prisma.$transaction(async (tx) => {
    if (await tx.voyage.findUnique({ where: { id } })) throw new Conflit('Identifiant déjà utilisé');
    await verifierParticipants(tx, familleId, params.participants);
    const articles = genererArticles(params, await profilsDe(tx, familleId), CATALOGUE);
    await tx.voyage.create({ data: { id, familleId, ...colonnesParametres(params) } });
    await remplacerArticles(tx, id, articles);
    return voyageDe(tx, familleId, id);
  });
}

/** Modifie les paramètres et régénère la liste en gardant pointage, quantités ajustées et ajouts. */
export async function modifierVoyage(familleId: string, voyageId: string, donnees: unknown) {
  const params = schemaNouveauVoyage.omit({ id: true }).parse(donnees) as ParametresVoyage;
  return prisma.$transaction(async (tx) => {
    const ancien = await voyageDe(tx, familleId, voyageId);
    await verifierParticipants(tx, familleId, params.participants);
    const articles = fusionner(
      ancien.articles,
      genererArticles(params, await profilsDe(tx, familleId), CATALOGUE),
      params.participants,
    );
    await tx.voyage.update({ where: { id: voyageId }, data: colonnesParametres(params) });
    await remplacerArticles(tx, voyageId, articles);
    return voyageDe(tx, familleId, voyageId);
  });
}

export async function supprimerVoyage(familleId: string, voyageId: string) {
  const { count } = await prisma.voyage.deleteMany({ where: { id: voyageId, familleId } });
  if (!count) throw new Introuvable('Voyage introuvable');
}

// --- Articles d'un voyage ---

async function verifierVoyage(familleId: string, voyageId: string) {
  if (!(await prisma.voyage.count({ where: { id: voyageId, familleId } }))) throw new Introuvable('Voyage introuvable');
}

/** Pointage, quantité ou passage valise ↔ courses. */
export async function majArticle(familleId: string, voyageId: string, articleId: string, donnees: unknown) {
  const patch = schemaMajArticle.parse(donnees);
  await verifierVoyage(familleId, voyageId);
  try {
    const ligne = await prisma.articleVoyage.update({
      where: { voyageId_id: { voyageId, id: articleId } },
      data: {
        ...(patch.statut && { statut: patch.statut }),
        ...(patch.quantite && { quantite: patch.quantite, ajuste: true }),
        ...(patch.liste && { liste: patch.liste, listeChoisie: true }),
      },
    });
    return versArticle(ligne);
  } catch {
    throw new Introuvable('Article introuvable');
  }
}

export async function ajouterArticle(familleId: string, voyageId: string, donnees: unknown) {
  const a = schemaAjoutArticle.parse(donnees);
  const voyage = await prisma.voyage.findFirst({ where: { id: voyageId, familleId } });
  if (!voyage) throw new Introuvable('Voyage introuvable');
  if (a.proprietaire !== COMMUN && !(voyage.participants as string[]).includes(a.proprietaire)) {
    throw new Introuvable('Participant inconnu');
  }
  const article: ArticleVoyage = {
    id: `ajout-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    nom: a.nom,
    categorie: a.categorie,
    proprietaire: a.proprietaire,
    quantite: 1,
    statut: 'a-prendre',
    liste: a.liste,
    origine: 'ajout',
  };
  await prisma.articleVoyage.create({ data: colonnesArticle(voyageId, article) });
  return article;
}

/** Ajoute une suggestion : elle est recalculée côté serveur, l'interface n'envoie que son identifiant. */
export async function ajouterSuggestion(familleId: string, voyageId: string, suggestionId: string) {
  const voyage = await voyageDe(prisma, familleId, voyageId);
  const suggestion = genererSuggestions(voyage, await profilsDe(prisma, familleId), CATALOGUE, voyage.articles).find(
    (s) => s.id === suggestionId,
  );
  if (!suggestion) throw new Introuvable('Suggestion introuvable');
  await prisma.articleVoyage.create({ data: colonnesArticle(voyageId, suggestion) });
  return suggestion;
}

/** Seuls les articles ajoutés à la main ou depuis les suggestions se suppriment. */
export async function supprimerArticle(familleId: string, voyageId: string, articleId: string) {
  await verifierVoyage(familleId, voyageId);
  const { count } = await prisma.articleVoyage.deleteMany({
    where: { voyageId, id: articleId, origine: { in: ['ajout', 'suggestion'] } },
  });
  if (!count) throw new Introuvable('Article introuvable ou non supprimable');
}

// --- Reprise des données saisies dans le navigateur ---

/** Importe les données locales, seulement si la famille est encore vide (évite les doublons). */
export async function importer(familleId: string, donnees: unknown) {
  const { profils, voyages } = schemaImport.parse(donnees) as z.infer<typeof schemaImport>;
  return prisma.$transaction(async (tx) => {
    const dejaLa =
      (await tx.profil.count({ where: { familleId } })) + (await tx.voyage.count({ where: { familleId } }));
    if (dejaLa) throw new Conflit('Le compte contient déjà des données');
    const ids = [...profils.map((p) => p.id), ...voyages.map((v) => v.id)];
    const pris =
      (await tx.profil.count({ where: { id: { in: ids } } })) + (await tx.voyage.count({ where: { id: { in: ids } } }));
    if (pris) throw new Conflit('Données déjà importées sur un autre compte');

    const idsProfils = new Set(profils.map((p) => p.id));
    for (const p of profils) {
      await tx.profil.create({
        data: {
          id: p.id,
          familleId,
          prenom: p.prenom,
          couleur: p.couleur ?? null,
          anneeNaissance: p.anneeNaissance,
          sexe: p.sexe ?? null,
          habitudes: json(p.habitudes),
          responsabilites: json(p.responsabilites),
          articlesPerso: json(p.articlesPerso),
        },
      });
    }
    for (const { id, articles, ...params } of voyages) {
      const participants = params.participants.filter((x) => idsProfils.has(x));
      await tx.voyage.create({ data: { id, familleId, ...colonnesParametres({ ...params, participants }) } });
      const valides = articles.filter((a) => a.proprietaire === COMMUN || participants.includes(a.proprietaire));
      await remplacerArticles(tx, id, valides as ArticleVoyage[]);
    }
    return etatTx(tx, familleId);
  });
}
