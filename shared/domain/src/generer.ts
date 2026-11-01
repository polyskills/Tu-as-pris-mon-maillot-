import {
  ArticleCatalogue,
  ArticleVoyage,
  Categorie,
  COMMUN,
  Condition,
  Habitude,
  Liste,
  ParametresVoyage,
  Profil,
  RegleQuantite,
  Sexe,
  TrancheAge,
} from './types';

export function trancheAge(anneeNaissance: number, dateDepart: string): TrancheAge {
  const age = Number(dateDepart.slice(0, 4)) - anneeNaissance;
  if (age < 3) return 'bebe';
  if (age < 12) return 'enfant';
  if (age < 18) return 'ado';
  if (age < 65) return 'adulte';
  return 'senior';
}

/** Ce qu'on sait des personnes concernées par une condition. */
interface Personnes {
  ages: TrancheAge[];
  sexes: Sexe[];
  habitudes: Habitude[];
}

const intersecte = <T>(attendu: T[] | undefined, present: T[]) =>
  attendu === undefined || attendu.some((v) => present.includes(v));

function satisfait(c: Condition, v: ParametresVoyage, p: Personnes): boolean {
  return (
    intersecte(c.destinations, v.destinations) &&
    intersecte(c.climats, [v.climat]) &&
    intersecte(c.zones, [v.zone]) &&
    intersecte(c.transports, v.transports) &&
    intersecte(c.hebergements, [v.hebergement]) &&
    intersecte(c.activites, v.activites) &&
    intersecte(c.ages, p.ages) &&
    intersecte(c.sexes, p.sexes) &&
    intersecte(c.habitudes, p.habitudes) &&
    (c.machineALaver === undefined || c.machineALaver === v.machineALaver) &&
    (c.nuitsMin === undefined || v.nuits >= c.nuitsMin) &&
    !(c.sauf && (Array.isArray(c.sauf) ? c.sauf : [c.sauf]).some((x) => satisfait(x, v, p)))
  );
}

export function estRequis(article: ArticleCatalogue, v: ParametresVoyage, p: Personnes): boolean {
  if (article.mode === 'voiture' && !v.transports.includes('voiture')) return false;
  if (!article.si) return true;
  const conditions = Array.isArray(article.si) ? article.si : [article.si];
  return conditions.some((c) => satisfait(c, v, p));
}

/** Jours comptés : nuits + 1, plafonnés à 7 si on peut laver sur place. */
export function joursComptes(nuits: number, machineALaver: boolean): number {
  const jours = Math.max(1, nuits + 1);
  return machineALaver ? Math.min(jours, 7) : jours;
}

export function calculerQuantite(
  regle: RegleQuantite | undefined,
  v: ParametresVoyage,
  nbParticipants: number,
): number {
  if (!regle) return 1;
  switch (regle.type) {
    case 'fixe':
      return regle.n;
    case 'parClimat':
      return regle[v.climat];
    case 'parParticipant':
      return Math.max(1, nbParticipants);
    case 'parJour': {
      const ratio = v.climat === 'chaud' && regle.auChaud !== undefined ? regle.auChaud : regle.ratio;
      const brut = Math.ceil(ratio * joursComptes(v.nuits, v.machineALaver) + (regle.plus ?? 0));
      return Math.max(1, regle.max ? Math.min(brut, regle.max) : brut);
    }
  }
}

/** En avion ou en train, ce qui s'achète facilement sur place va dans la liste de courses. */
const coursesSurPlace = (v: ParametresVoyage) => v.transports.includes('avion') || v.transports.includes('train');

function listePour(article: ArticleCatalogue, v: ParametresVoyage): Liste {
  if (article.mode === 'voiture') return 'voiture';
  return article.achetable && coursesSurPlace(v) ? 'courses' : 'valise';
}

/** Parcourt le catalogue et produit un article par propriétaire concerné. */
function appliquer(
  v: ParametresVoyage,
  profils: Profil[],
  catalogue: ArticleCatalogue[],
  origine: ArticleVoyage['origine'],
) {
  const participants = profils.filter((p) => v.participants.includes(p.id));
  const resultat: ArticleVoyage[] = [];
  if (participants.length === 0) return resultat;

  const groupe: Personnes = {
    ages: participants.map((p) => trancheAge(p.anneeNaissance, v.depart)),
    sexes: participants.flatMap((p) => (p.sexe ? [p.sexe] : [])),
    habitudes: participants.flatMap((p) => p.habitudes),
  };

  for (const article of catalogue) {
    const base = {
      nom: article.nom,
      categorie: article.categorie,
      quantite: calculerQuantite(article.quantite, v, participants.length),
      statut: 'a-prendre' as const,
      liste: listePour(article, v),
      origine,
      ...(article.achetable && { achetable: true }),
    };

    if (article.portee === 'commun') {
      if (estRequis(article, v, groupe)) {
        resultat.push({ ...base, id: `${COMMUN}:${article.id}`, proprietaire: COMMUN });
      }
      continue;
    }

    for (const p of participants) {
      const personne: Personnes = {
        ages: [trancheAge(p.anneeNaissance, v.depart)],
        sexes: p.sexe ? [p.sexe] : [],
        habitudes: p.habitudes,
      };
      if (estRequis(article, v, personne)) {
        resultat.push({ ...base, id: `${p.id}:${article.id}`, proprietaire: p.id });
      }
    }
  }
  return resultat;
}

/** Génère la liste d'un voyage (valise, courses, check-list voiture) à partir du catalogue et des profils. */
export function genererArticles(
  v: ParametresVoyage,
  profils: Profil[],
  catalogue: ArticleCatalogue[],
): ArticleVoyage[] {
  const resultat = appliquer(
    v,
    profils,
    catalogue.filter((a) => a.mode !== 'suggestion'),
    'catalogue',
  );

  for (const p of profils.filter((x) => v.participants.includes(x.id))) {
    for (const perso of p.articlesPerso) {
      resultat.push({
        id: `${p.id}:perso-${perso.id}`,
        nom: perso.nom,
        categorie: perso.categorie,
        quantite: perso.quantite,
        statut: 'a-prendre',
        liste: 'valise',
        proprietaire: p.id,
        origine: 'perso',
      });
    }
  }

  return resultat;
}

/** Suggestions qui correspondent au voyage et ne sont pas déjà dans la liste. */
export function genererSuggestions(
  v: ParametresVoyage,
  profils: Profil[],
  catalogue: ArticleCatalogue[],
  dejaLa: ArticleVoyage[],
): ArticleVoyage[] {
  const ids = new Set(dejaLa.map((a) => a.id));
  return appliquer(
    v,
    profils,
    catalogue.filter((a) => a.mode === 'suggestion'),
    'suggestion',
  ).filter((a) => !ids.has(a.id));
}

/**
 * Régénère la liste après une modification du voyage ou des profils,
 * sans perdre ce qui a déjà été pointé, les choix manuels ni les ajouts.
 */
export function fusionner(
  anciens: ArticleVoyage[],
  nouveaux: ArticleVoyage[],
  participants: string[],
): ArticleVoyage[] {
  const parId = new Map(anciens.map((a) => [a.id, a]));
  const fusion = nouveaux.map((n) => {
    const ancien = parId.get(n.id);
    if (!ancien) return n;
    return {
      ...n,
      statut: ancien.statut,
      quantite: ancien.ajuste ? ancien.quantite : n.quantite,
      ajuste: ancien.ajuste,
      liste: ancien.listeChoisie ? ancien.liste : n.liste,
      listeChoisie: ancien.listeChoisie,
      ...(ancien.pointePar && { pointePar: ancien.pointePar }),
    };
  });
  const ajouts = anciens.filter(
    (a) =>
      (a.origine === 'ajout' || a.origine === 'suggestion') &&
      (a.proprietaire === COMMUN || participants.includes(a.proprietaire)),
  );
  return [...fusion, ...ajouts];
}

export interface Progression {
  total: number;
  faits: number;
  restants: number;
}

/** Les articles « pas besoin » ne comptent pas. */
export function progression(articles: ArticleVoyage[]): Progression {
  const utiles = articles.filter((a) => a.statut !== 'pas-besoin');
  const faits = utiles.filter((a) => a.statut === 'dans-valise').length;
  return { total: utiles.length, faits, restants: utiles.length - faits };
}

/** Qui s'occupe d'une catégorie d'affaires communes, parmi les participants. */
export function responsable(categorie: Categorie, profils: Profil[], participants: string[]): Profil | undefined {
  return profils.find((p) => participants.includes(p.id) && p.responsabilites.includes(categorie));
}

/** Habitudes pré-cochées à la création d'un profil, selon l'âge. */
export function habitudesParDefaut(anneeNaissance: number, anneeCourante: number): Habitude[] {
  const age = anneeCourante - anneeNaissance;
  const habitudes: Habitude[] = [];
  if (age < 3) habitudes.push('couches', 'biberon');
  if (age < 6) habitudes.push('ne-nage-pas');
  return habitudes;
}

const SANTE: Habitude[] = ['lunettes', 'traitement', 'allergies', 'mal-transports'];
const LOISIRS: Habitude[] = ['lecture', 'photo', 'jeux-video'];
const GRAND: Habitude[] = ['lentilles', 'rasage', 'maquillage', 'protections', 'cheveux-longs', 'appareil-dentaire'];

/** Habitudes proposées sur le profil selon la tranche d'âge (pas de « Couches » pour un adulte, etc.). */
export const HABITUDES_PAR_AGE: Record<TrancheAge, Habitude[]> = {
  bebe: [...SANTE, 'couches', 'biberon', 'repas-bebe', 'allaitement', 'tetine', 'doudou', 'ne-nage-pas'],
  enfant: [...SANTE, 'cheveux-longs', 'appareil-dentaire', 'couches', 'tetine', 'doudou', 'ne-nage-pas', ...LOISIRS],
  ado: [...SANTE, ...GRAND, 'doudou', ...LOISIRS],
  adulte: [...SANTE, ...GRAND, ...LOISIRS],
  senior: [...SANTE, ...GRAND, ...LOISIRS],
};

/** Habitudes qu'on ne propose pas à un garçon ou un homme (il peut ajouter l'article dans ses articles perso). */
const FEMININES: Habitude[] = ['maquillage', 'protections'];

/** Habitudes proposées sur le profil selon l'âge et, s'il est précisé, le sexe. */
export function habitudesProposees(tranche: TrancheAge, sexe?: Sexe): Habitude[] {
  return HABITUDES_PAR_AGE[tranche].filter((h) => sexe !== 'M' || !FEMININES.includes(h));
}
