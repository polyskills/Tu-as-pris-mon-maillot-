import { Activite, Categorie, Climat, Destination, Habitude, Hebergement, TrancheAge, Transport, Zone } from './types';

// Libellés affichés à l'écran, dans l'ordre où on les propose.

export const DESTINATIONS: Record<Destination, string> = {
  plage: '🏖️ Plage',
  montagne: '⛰️ Montagne',
  ski: '⛷️ Ski',
  ville: '🏙️ Ville',
  campagne: '🌳 Campagne',
};

export const CLIMATS: Record<Climat, string> = {
  chaud: '☀️ Chaud',
  tempere: '⛅ Tempéré',
  froid: '❄️ Froid',
};

export const ZONES: Record<Zone, string> = {
  france: '🇫🇷 France',
  europe: '🇪🇺 Europe',
  'hors-europe': '🌍 Hors Europe',
};

export const TRANSPORTS: Record<Transport, string> = {
  voiture: '🚗 Voiture',
  avion: '✈️ Avion',
  train: '🚆 Train',
  bateau: '⛴️ Bateau',
};

export const HEBERGEMENTS: Record<Hebergement, string> = {
  hotel: '🏨 Hôtel',
  location: '🏠 Location',
  'mobil-home': '🚐 Mobil-home',
  tente: '⛺ Camping (tente)',
  famille: '👵 Famille / amis',
};

export const ACTIVITES: Record<Activite, string> = {
  baignade: 'Baignade',
  randonnee: 'Randonnée',
  velo: 'Vélo',
  sport: 'Sport',
  soiree: 'Soirées / resto chic',
  plongee: 'Plongée / snorkeling',
  peche: 'Pêche',
  travail: 'Travail',
};

export const HABITUDES: Record<Habitude, string> = {
  lunettes: 'Lunettes',
  lentilles: 'Lentilles',
  traitement: 'Traitement médical',
  allergies: 'Allergies',
  'mal-transports': 'Mal des transports',
  rasage: 'Rasage',
  maquillage: 'Maquillage',
  protections: 'Protections périodiques',
  'cheveux-longs': 'Cheveux longs',
  'appareil-dentaire': 'Appareil dentaire',
  couches: 'Couches',
  biberon: 'Biberon',
  'repas-bebe': 'Repas bébé (petits pots)',
  allaitement: 'Allaitement',
  tetine: 'Tétine',
  doudou: 'Doudou',
  'ne-nage-pas': 'Ne sait pas encore nager',
  lecture: 'Lecture',
  photo: 'Photo',
  'jeux-video': 'Jeux vidéo / tablette',
};

export const CATEGORIES: Record<Categorie, string> = {
  papiers: '📄 Papiers',
  vetements: '👕 Vêtements',
  bebe: '🍼 Bébé',
  toilette: '🧴 Toilette',
  sante: '💊 Santé',
  electronique: '🔌 Électronique',
  voyage: '🧳 Trajet',
  maison: '🏠 Sur place',
  plage: '🏖️ Plage',
  montagne: '⛰️ Montagne',
  loisirs: '🎲 Loisirs',
};

export const TRANCHES: Record<TrancheAge, string> = {
  bebe: 'Bébé',
  enfant: 'Enfant',
  ado: 'Ado',
  adulte: 'Adulte',
  senior: 'Senior',
};

export const cles = <K extends string>(r: Record<K, string>) => Object.keys(r) as K[];
