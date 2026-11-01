import type { ArticleCatalogue, ArticleVoyage, Liste, Profil, Statut, Voyage } from '@maillot/domain';

// Hors ligne : les données du compte sont gardées sur l'appareil (l'application s'ouvre sans réseau), et le
// pointage fait sans réseau attend dans une file, elle aussi gardée sur l'appareil, jusqu'au retour du réseau.

/** Modification d'un article : pointage, quantité ou liste (valise / courses / voiture). */
export type PatchArticle = { statut?: Statut; quantite?: number; liste?: Liste };
export type PointageEnAttente = { voyageId: string; articleId: string; patch: PatchArticle };

/**
 * Ajoute une modification à la file. Plusieurs modifications du même article n'en font qu'une (la dernière valeur
 * de chaque champ gagne) : moins d'envois au retour du réseau. L'entrée fusionnée est un nouvel objet, ce qui
 * permet à l'envoi en cours de savoir si son entrée a changé entre-temps.
 */
export function ajouterALaFile(file: PointageEnAttente[], e: PointageEnAttente): PointageEnAttente[] {
  const i = file.findIndex((x) => x.voyageId === e.voyageId && x.articleId === e.articleId);
  if (i < 0) return [...file, e];
  const fusion = { ...file[i], patch: { ...file[i].patch, ...e.patch } };
  return [...file.slice(0, i), fusion, ...file.slice(i + 1)];
}

/** Article ajouté hors connexion du serveur : son identifiant provisoire est remplacé par le définitif. */
export function renommerDansFile(
  file: PointageEnAttente[],
  voyageId: string,
  ancien: string,
  nouveau: string,
): PointageEnAttente[] {
  return file.map((e) => (e.voyageId === voyageId && e.articleId === ancien ? { ...e, articleId: nouveau } : e));
}

/** Effet local d'une modification, tel que le serveur l'appliquera. */
export function appliquerPatch(a: ArticleVoyage, patch: PatchArticle, email?: string): ArticleVoyage {
  return {
    ...a,
    ...(patch.statut && { statut: patch.statut, ...(email && { pointePar: email }) }),
    ...(patch.quantite && { quantite: patch.quantite, ajuste: true }),
    ...(patch.liste && { liste: patch.liste, listeChoisie: true }),
  };
}

/** Données reçues du serveur + modifications pas encore envoyées : ce que l'écran doit montrer. */
export function appliquerFile(voyages: Voyage[], file: PointageEnAttente[], email?: string): Voyage[] {
  if (!file.length) return voyages;
  return voyages.map((v) => {
    const pourCeVoyage = file.filter((e) => e.voyageId === v.id);
    if (!pourCeVoyage.length) return v;
    return {
      ...v,
      articles: v.articles.map((a) => {
        const e = pourCeVoyage.find((x) => x.articleId === a.id);
        return e ? appliquerPatch(a, e.patch, email) : a;
      }),
    };
  });
}

// --- Stockage sur l'appareil ---

export type DonneesLocales = {
  email: string;
  familleId?: string;
  profils: Profil[];
  voyages: Voyage[];
  catalogue: ArticleCatalogue[];
};

const CLE_DONNEES = 'maillot-donnees-v1';
const CLE_FILE = 'maillot-file-v1';

/** Le stockage peut être indisponible (navigation privée, quota plein) : l'application marche alors sans. */
const stockage = () => (typeof window === 'undefined' ? undefined : window.localStorage);

function lire<T>(cle: string): T | undefined {
  try {
    const brut = stockage()?.getItem(cle);
    return brut ? (JSON.parse(brut) as T) : undefined;
  } catch {
    return undefined;
  }
}

function ecrire(cle: string, valeur: unknown) {
  try {
    stockage()?.setItem(cle, JSON.stringify(valeur));
  } catch {
    // Quota plein ou stockage interdit : tant pis pour le hors-ligne.
  }
}

export const lireDonnees = () => lire<DonneesLocales>(CLE_DONNEES);
export const sauverDonnees = (d: DonneesLocales) => ecrire(CLE_DONNEES, d);
export const lireFile = () => lire<PointageEnAttente[]>(CLE_FILE) ?? [];
export const sauverFile = (f: PointageEnAttente[]) => (f.length ? ecrire(CLE_FILE, f) : effacer(CLE_FILE));

function effacer(cle: string) {
  try {
    stockage()?.removeItem(cle);
  } catch {
    // rien
  }
}

/** À la déconnexion : rien du compte ne reste sur l'appareil (il peut être partagé). */
export function effacerDonneesLocales() {
  effacer(CLE_DONNEES);
  effacer(CLE_FILE);
}
