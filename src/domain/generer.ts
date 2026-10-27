import {
  ArticleCatalogue,
  ArticleVoyage,
  Categorie,
  COMMUN,
  Condition,
  Habitude,
  ParametresVoyage,
  Profil,
  RegleQuantite,
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
  habitudes: Habitude[];
}

const intersecte = <T>(attendu: T[] | undefined, present: T[]) =>
  attendu === undefined || attendu.some((v) => present.includes(v));

function satisfait(c: Condition, v: ParametresVoyage, p: Personnes): boolean {
  return (
    intersecte(c.destinations, v.destinations) &&
    intersecte(c.climats, [v.climat]) &&
    intersecte(c.transports, v.transports) &&
    intersecte(c.hebergements, [v.hebergement]) &&
    intersecte(c.activites, v.activites) &&
    intersecte(c.ages, p.ages) &&
    intersecte(c.habitudes, p.habitudes) &&
    (c.etranger === undefined || c.etranger === v.etranger) &&
    (c.machineALaver === undefined || c.machineALaver === v.machineALaver) &&
    (c.nuitsMin === undefined || v.nuits >= c.nuitsMin)
  );
}

export function estRequis(article: ArticleCatalogue, v: ParametresVoyage, p: Personnes): boolean {
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
  nuits: number,
  machineALaver: boolean,
): number {
  if (!regle) return 1;
  if (regle.type === 'fixe') return regle.n;
  const brut = Math.ceil(regle.ratio * joursComptes(nuits, machineALaver) + (regle.plus ?? 0));
  return Math.max(1, regle.max ? Math.min(brut, regle.max) : brut);
}

/** Génère la liste complète d'un voyage à partir du catalogue et des profils. */
export function genererArticles(
  v: ParametresVoyage,
  profils: Profil[],
  catalogue: ArticleCatalogue[],
): ArticleVoyage[] {
  const participants = profils.filter((p) => v.participants.includes(p.id));
  const resultat: ArticleVoyage[] = [];

  const groupe: Personnes = {
    ages: participants.map((p) => trancheAge(p.anneeNaissance, v.depart)),
    habitudes: participants.flatMap((p) => p.habitudes),
  };

  for (const article of catalogue) {
    const quantite = calculerQuantite(article.quantite, v.nuits, v.machineALaver);
    const base = { nom: article.nom, categorie: article.categorie, quantite, statut: 'a-prendre' as const };

    if (article.portee === 'commun') {
      if (participants.length > 0 && estRequis(article, v, groupe)) {
        resultat.push({ ...base, id: `${COMMUN}:${article.id}`, proprietaire: COMMUN, origine: 'catalogue' });
      }
      continue;
    }

    for (const p of participants) {
      const personne: Personnes = {
        ages: [trancheAge(p.anneeNaissance, v.depart)],
        habitudes: p.habitudes,
      };
      if (estRequis(article, v, personne)) {
        resultat.push({ ...base, id: `${p.id}:${article.id}`, proprietaire: p.id, origine: 'catalogue' });
      }
    }
  }

  for (const p of participants) {
    for (const perso of p.articlesPerso) {
      resultat.push({
        id: `${p.id}:perso-${perso.id}`,
        nom: perso.nom,
        categorie: perso.categorie,
        quantite: perso.quantite,
        statut: 'a-prendre',
        proprietaire: p.id,
        origine: 'perso',
      });
    }
  }

  return resultat;
}

/**
 * Régénère la liste après une modification du voyage ou des profils,
 * sans perdre ce qui a déjà été pointé ni les ajouts manuels.
 */
export function fusionner(anciens: ArticleVoyage[], nouveaux: ArticleVoyage[], participants: string[]): ArticleVoyage[] {
  const parId = new Map(anciens.map((a) => [a.id, a]));
  const fusion = nouveaux.map((n) => {
    const ancien = parId.get(n.id);
    if (!ancien) return n;
    return {
      ...n,
      statut: ancien.statut,
      quantite: ancien.ajuste ? ancien.quantite : n.quantite,
      ajuste: ancien.ajuste,
    };
  });
  const ajouts = anciens.filter(
    (a) => a.origine === 'ajout' && (a.proprietaire === COMMUN || participants.includes(a.proprietaire)),
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
