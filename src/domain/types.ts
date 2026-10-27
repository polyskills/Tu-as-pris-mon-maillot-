// Modèle de données de l'appli. Tout est en français pour coller au vocabulaire métier.

export type Destination = 'plage' | 'montagne' | 'ski' | 'ville' | 'campagne';
export type Climat = 'chaud' | 'tempere' | 'froid';
export type Zone = 'france' | 'europe' | 'hors-europe';
export type Transport = 'voiture' | 'avion' | 'train' | 'bateau';
export type Hebergement = 'hotel' | 'location' | 'mobil-home' | 'tente' | 'famille';
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
  | 'allergies'
  | 'mal-transports'
  | 'rasage'
  | 'maquillage'
  | 'protections'
  | 'cheveux-longs'
  | 'appareil-dentaire'
  | 'couches'
  | 'biberon'
  | 'repas-bebe'
  | 'allaitement'
  | 'tetine'
  | 'doudou'
  | 'ne-nage-pas'
  | 'lecture'
  | 'photo'
  | 'jeux-video';

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
  zones?: Zone[];
  transports?: Transport[];
  hebergements?: Hebergement[];
  activites?: Activite[];
  ages?: TrancheAge[];
  habitudes?: Habitude[];
  machineALaver?: boolean;
  nuitsMin?: number;
  /** Exclusion : si cette condition (ou l'une d'elles) est vraie, la condition entière est fausse. */
  sauf?: Condition | Condition[];
}

export type RegleQuantite =
  | { type: 'fixe'; n: number }
  /**
   * ratio × jours + plus, plafonné à max. Avec une machine à laver, les jours comptés sont plafonnés à 7.
   * `auChaud` remplace le ratio quand le climat est chaud.
   */
  | { type: 'parJour'; ratio: number; plus?: number; max?: number; auChaud?: number }
  | { type: 'parClimat'; chaud: number; tempere: number; froid: number }
  /** Pour un article commun : autant que de participants. */
  | { type: 'parParticipant' };

export interface ArticleCatalogue {
  id: string;
  nom: string;
  categorie: Categorie;
  /** 'personne' : un exemplaire par participant concerné. 'commun' : un seul pour le groupe. */
  portee: 'personne' | 'commun';
  /** Absent = toujours. Tableau = au moins une des conditions (OU). */
  si?: Condition | Condition[];
  quantite?: RegleQuantite;
  /**
   * 'suggestion' : proposé, ajouté d'un tap. 'voiture' : check-list voiture (trajet en voiture seulement).
   * Absent : mis d'office dans la liste.
   */
  mode?: 'suggestion' | 'voiture';
  /** Facile à trouver sur place : va dans la liste de courses si le trajet se fait en avion ou en train. */
  achetable?: boolean;
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
  zone: Zone;
  transports: Transport[];
  hebergement: Hebergement;
  machineALaver: boolean;
  activites: Activite[];
  participants: string[];
}

export type Statut = 'a-prendre' | 'dans-valise' | 'pas-besoin';

/** Où se trouve l'article : dans la valise, sur la liste de courses à l'arrivée, ou dans la check-list voiture. */
export type Liste = 'valise' | 'courses' | 'voiture';

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
  liste: Liste;
  origine: 'catalogue' | 'perso' | 'ajout' | 'suggestion';
  /** Vrai si la quantité a été modifiée à la main : on ne la recalcule plus. */
  ajuste?: boolean;
  /** Vrai si la liste (valise / courses) a été choisie à la main : on ne la recalcule plus. */
  listeChoisie?: boolean;
  /** Peut passer dans la liste de courses. */
  achetable?: boolean;
}

export interface Voyage extends ParametresVoyage {
  id: string;
  creeLe: string;
  articles: ArticleVoyage[];
}
