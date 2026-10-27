// Modèle de données de l'appli. Tout est en français pour coller au vocabulaire métier.

export type Destination = 'plage' | 'montagne' | 'ski' | 'ville' | 'campagne';
export type Climat = 'chaud' | 'tempere' | 'froid';
export type Transport = 'voiture' | 'avion' | 'train' | 'bateau';
export type Hebergement = 'hotel' | 'location' | 'camping' | 'famille';
export type Activite =
  | 'baignade'
  | 'randonnee'
  | 'velo'
  | 'sport'
  | 'soiree'
  | 'plongee'
  | 'peche'
  | 'travail';

export type TrancheAge = 'bebe' | 'enfant' | 'ado' | 'adulte' | 'senior';

export type Habitude =
  | 'lunettes'
  | 'lentilles'
  | 'traitement'
  | 'rasage'
  | 'maquillage'
  | 'protections'
  | 'doudou'
  | 'tetine'
  | 'couches'
  | 'appareil-dentaire'
  | 'lecture'
  | 'photo'
  | 'jeux-video'
  | 'cheveux-longs'
  | 'allergies';

export type Categorie =
  | 'papiers'
  | 'vetements'
  | 'toilette'
  | 'sante'
  | 'electronique'
  | 'bebe'
  | 'loisirs'
  | 'plage'
  | 'montagne'
  | 'maison'
  | 'voyage';

/**
 * Condition d'apparition d'un article. Chaque champ renseigné doit être satisfait (ET).
 * À l'intérieur d'un champ, il suffit qu'une valeur corresponde (OU).
 */
export interface Condition {
  destinations?: Destination[];
  climats?: Climat[];
  transports?: Transport[];
  hebergements?: Hebergement[];
  activites?: Activite[];
  ages?: TrancheAge[];
  habitudes?: Habitude[];
  etranger?: boolean;
  machineALaver?: boolean;
  nuitsMin?: number;
}

export type RegleQuantite =
  | { type: 'fixe'; n: number }
  /** ratio × jours + plus, plafonné à max. Avec une machine à laver, les jours comptés sont plafonnés à 7. */
  | { type: 'parJour'; ratio: number; plus?: number; max?: number };

export interface ArticleCatalogue {
  id: string;
  nom: string;
  categorie: Categorie;
  /** 'personne' : un exemplaire par participant concerné. 'commun' : un seul pour le groupe. */
  portee: 'personne' | 'commun';
  /** Absent = toujours. Tableau = au moins une des conditions (OU). */
  si?: Condition | Condition[];
  quantite?: RegleQuantite;
}

export interface ArticlePerso {
  id: string;
  nom: string;
  categorie: Categorie;
  quantite: number;
}

export interface Profil {
  id: string;
  prenom: string;
  /** Couleur de l'avatar. Absente sur les profils créés avant son ajout. */
  couleur?: string;
  anneeNaissance: number;
  habitudes: Habitude[];
  /** Catégories d'affaires communes dont cette personne s'occupe (ex. papiers, santé). */
  responsabilites: Categorie[];
  /** Articles qu'elle emporte à chaque voyage, en plus de la base. */
  articlesPerso: ArticlePerso[];
}

export interface ParametresVoyage {
  nom: string;
  /** Date ISO AAAA-MM-JJ */
  depart: string;
  nuits: number;
  destinations: Destination[];
  climat: Climat;
  etranger: boolean;
  transports: Transport[];
  hebergement: Hebergement;
  machineALaver: boolean;
  activites: Activite[];
  participants: string[];
}

export type Statut = 'a-prendre' | 'dans-valise' | 'pas-besoin';

/** Identifiant du propriétaire d'un article : un profil, ou le groupe. */
export const COMMUN = 'commun';

export interface ArticleVoyage {
  /** Stable : `${proprietaire}:${source}` pour pouvoir régénérer sans perdre le pointage. */
  id: string;
  nom: string;
  categorie: Categorie;
  proprietaire: string;
  quantite: number;
  statut: Statut;
  origine: 'catalogue' | 'perso' | 'ajout';
  /** Vrai si la quantité a été modifiée à la main : on ne la recalcule plus. */
  ajuste?: boolean;
}

export interface Voyage extends ParametresVoyage {
  id: string;
  creeLe: string;
  articles: ArticleVoyage[];
}
