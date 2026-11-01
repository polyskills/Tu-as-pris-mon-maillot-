// Informations légales, utilisées par les pages « Mentions légales » et « Confidentialité ».
// Source : annuaire des entreprises (recherche-entreprises.api.gouv.fr). Une valeur `null` s'affiche comme un repère
// « à compléter » bien visible : à renseigner avant l'ouverture au public.

export const EDITEUR = {
  marque: 'Adaptools',
  societe: 'POLYSKILLS',
  forme: 'SAS (société par actions simplifiée)',
  capital: null as string | null,
  siege: '60 rue François Ier, 75008 Paris',
  rcs: 'RCS Paris 981 166 945',
  siret: '981 166 945 00015',
  tva: 'FR54 981 166 945',
  directeurPublication: 'Matthieu Hutin, directeur général de Polyskills',
  /** Adresse de contact, aussi pour les demandes sur les données personnelles. */
  contact: null as string | null,
};

export const HEBERGEUR = {
  /** Société qui loue le serveur (VPS) : nom, adresse, téléphone. */
  identite: null as string | null,
  /** Pays où sont les données (Union européenne ?). */
  pays: null as string | null,
};

/** Prestataire d'envoi des e-mails (liens de connexion, invitations). */
export const PRESTATAIRE_EMAILS = null as string | null;

/** Durée de conservation des journaux du serveur web (adresse IP, page demandée). */
export const DUREE_JOURNAUX = null as string | null;

/** Date de la dernière mise à jour des pages légales. */
export const MISE_A_JOUR = '1er novembre 2026';
