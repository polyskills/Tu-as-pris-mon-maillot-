import { ArticleCatalogue, Categorie, Condition, RegleQuantite, TrancheAge } from './types';

// Base d'articles fournie par défaut. Les règles se lisent : « on prend X si … ».
// Décisions de tri détaillées dans docs/tri-base.md.

const perso = (
  id: string,
  nom: string,
  categorie: Categorie,
  si?: Condition | Condition[],
  quantite?: RegleQuantite,
): ArticleCatalogue => ({ id, nom, categorie, portee: 'personne', si, quantite });

const commun = (
  id: string,
  nom: string,
  categorie: Categorie,
  si?: Condition | Condition[],
  quantite?: RegleQuantite,
): ArticleCatalogue => ({ id, nom, categorie, portee: 'commun', si, quantite });

/** Proposé en bas de liste, ajouté d'un tap. */
const suggestion = (a: ArticleCatalogue): ArticleCatalogue => ({ ...a, mode: 'suggestion' });
/** S'achète facilement sur place (liste de courses en avion ou en train). */
const achetable = (a: ArticleCatalogue): ArticleCatalogue => ({ ...a, achetable: true });
/** Check-list voiture : à vérifier avant de partir, seulement pour un trajet en voiture. */
const voiture = (id: string, nom: string, si?: Condition | Condition[]): ArticleCatalogue => ({
  id,
  nom,
  categorie: 'voyage',
  portee: 'commun',
  mode: 'voiture',
  si,
});

const parJour = (ratio: number, plus = 0, max?: number, auChaud?: number): RegleQuantite => ({
  type: 'parJour',
  ratio,
  plus,
  max,
  auChaud,
});
const fixe = (n: number): RegleQuantite => ({ type: 'fixe', n });
const PAR_PARTICIPANT: RegleQuantite = { type: 'parParticipant' };

const GRANDS: TrancheAge[] = ['enfant', 'ado', 'adulte', 'senior'];
const PETITS: TrancheAge[] = ['bebe', 'enfant'];
const MINEURS: TrancheAge[] = ['bebe', 'enfant', 'ado'];

const ADULTES: Condition = { ages: ['adulte', 'senior'] };
const NON_BEBE: Condition = { ages: GRANDS };
const PLUS_DE_12: Condition = { ages: ['ado', 'adulte', 'senior'] };
const HORS_FRANCE: Condition = { zones: ['europe', 'hors-europe'] };
const HORS_EUROPE: Condition = { zones: ['hors-europe'] };
const EUROPE: Condition = { zones: ['europe'] };
const FROID: Condition[] = [{ climats: ['froid'] }, { destinations: ['ski'] }];
const NAGE: Condition[] = [{ destinations: ['plage'] }, { activites: ['baignade', 'plongee'] }];
/** Au ski, à partir de 3 ans : on porte l'équipement de ski. */
const SKIEUR: Condition = { destinations: ['ski'], ages: GRANDS };
const LOGEMENT_A_EQUIPER: Condition = { hebergements: ['location', 'mobil-home'] };
const CUISINE_SUR_PLACE: Condition = { hebergements: ['location', 'mobil-home', 'tente'] };
const TENTE: Condition = { hebergements: ['tente'] };
const AVION_TRAIN: Condition = { transports: ['avion', 'train'] };

export const CATALOGUE: ArticleCatalogue[] = [
  // --- Papiers ---
  perso('carte-identite', "Carte d'identité", 'papiers', [
    ADULTES,
    { ages: MINEURS, transports: ['avion'] },
    { ages: MINEURS, ...HORS_FRANCE },
  ]),
  perso('passeport', 'Passeport', 'papiers', HORS_EUROPE),
  perso('carte-vitale', 'Carte Vitale', 'papiers', ADULTES),
  perso('ceam', "Carte européenne d'assurance maladie", 'papiers', EUROPE),
  perso('carte-embarquement', "Carte d'embarquement", 'papiers', { transports: ['avion'] }),
  perso('billet-train', 'Billet de train', 'papiers', { transports: ['train'] }),
  perso('carte-bancaire', 'Carte bancaire', 'papiers', ADULTES),
  perso('permis', 'Permis de conduire', 'papiers', { transports: ['voiture'], ...ADULTES }),
  perso('carnet-sante', 'Carnet de santé', 'papiers', { ages: PETITS }),
  perso('ordonnance', 'Ordonnance', 'papiers', { habitudes: ['traitement'] }),
  suggestion(perso('carte-peche', 'Carte de pêche (eau douce)', 'papiers', { activites: ['peche'], ...PLUS_DE_12 })),
  commun('reservations', 'Confirmations de réservation (hébergement, location)', 'papiers'),
  commun('assurance-voyage', 'Attestation assurance voyage / assistance', 'papiers', HORS_FRANCE),
  commun('carte-grise', 'Carte grise', 'papiers', { transports: ['voiture'] }),
  commun('assurance-auto-intl', "Carte internationale d'assurance auto", 'papiers', {
    transports: ['voiture'],
    ...HORS_EUROPE,
  }),
  commun('especes', 'Espèces / devises', 'papiers'),
  commun('cle-maison', 'Clés de la maison', 'papiers'),
  commun('cles-voiture', 'Clés de voiture', 'papiers', { transports: ['voiture'] }),
  commun('forfait-ski', 'Forfaits de ski (réservation)', 'papiers', { destinations: ['ski'] }),

  // --- Vêtements ---
  perso('sous-vetements', 'Sous-vêtements', 'vetements', PLUS_DE_12, parJour(1)),
  perso('sous-vetements-enfant', 'Sous-vêtements', 'vetements', { ages: ['enfant'] }, parJour(1, 2)),
  perso('chaussettes', 'Paires de chaussettes', 'vetements', NON_BEBE, parJour(1, 0, undefined, 0.5)),
  perso('tshirts', 'T-shirts / hauts', 'vetements', PLUS_DE_12, parJour(1)),
  perso('tshirts-enfant', 'T-shirts / hauts', 'vetements', { ages: ['enfant'] }, parJour(1.5)),
  perso(
    'pantalons',
    'Pantalons / jeans',
    'vetements',
    [
      { ...NON_BEBE, climats: ['tempere', 'froid'] },
      { ...NON_BEBE, destinations: ['ski', 'montagne'] },
    ],
    parJour(0.3, 1, 5),
  ),
  perso('shorts', 'Shorts / jupes', 'vetements', { ...NON_BEBE, climats: ['chaud', 'tempere'] }, parJour(0.5, 0, 6)),
  perso('pyjama', 'Pyjama', 'vetements', NON_BEBE, parJour(0.25, 0, 2)),
  perso('pull', 'Pull / sweat', 'vetements', NON_BEBE, { type: 'parClimat', chaud: 1, tempere: 2, froid: 3 }),
  perso('veste-legere', 'Veste légère / coupe-vent', 'vetements', { climats: ['chaud', 'tempere'] }),
  perso('manteau', 'Manteau chaud', 'vetements', FROID),
  perso('impermeable', 'Imperméable / K-way', 'vetements', [
    { climats: ['tempere'] },
    { destinations: ['montagne', 'campagne'] },
  ]),
  perso('tenue-soiree', 'Tenue habillée', 'vetements', { ...PLUS_DE_12, activites: ['soiree'] }),
  perso('chaussures-ville', 'Chaussures de tous les jours', 'vetements', NON_BEBE),
  perso('sandales', 'Sandales / tongs', 'vetements', { climats: ['chaud'] }),
  perso('chaussures-marche', 'Chaussures de marche', 'vetements', [
    { activites: ['randonnee'] },
    { destinations: ['montagne'] },
  ]),
  perso('chaussures-sport', 'Baskets de sport', 'vetements', { activites: ['sport', 'velo'] }),
  perso('chaussons', 'Chaussons', 'vetements', [
    { ages: PETITS },
    { hebergements: ['location', 'mobil-home', 'famille'], climats: ['froid', 'tempere'] },
  ]),
  perso('casquette', 'Casquette / chapeau', 'vetements', [
    { climats: ['chaud'] },
    { destinations: ['plage', 'montagne'] },
  ]),
  // Au ski, les skieurs ont leurs gants de ski et leur casque.
  perso('bonnet', 'Bonnet', 'vetements', FROID.map((c) => ({ ...c, sauf: SKIEUR }))),
  perso('gants', 'Gants', 'vetements', FROID.map((c) => ({ ...c, sauf: SKIEUR }))),
  perso('echarpe', 'Écharpe / tour de cou', 'vetements', FROID),
  perso('collant', 'Collants / sous-couches thermiques', 'vetements', FROID, parJour(0.3, 1, 3)),
  suggestion(perso('ceinture', 'Ceinture', 'vetements', PLUS_DE_12)),
  suggestion(
    perso('bottes-pluie', 'Bottes de pluie', 'vetements', {
      ages: PETITS,
      destinations: ['campagne', 'montagne'],
      climats: ['tempere'],
    }),
  ),

  // --- Bébé ---
  perso('bodies', 'Bodies', 'bebe', { ages: ['bebe'] }, parJour(1.5, 0, 12)),
  perso('pyjamas-bebe', 'Pyjamas / gigoteuse', 'bebe', { ages: ['bebe'] }, parJour(0.5, 1, 5)),
  perso('tenues-bebe', 'Tenues de jour', 'bebe', { ages: ['bebe'] }, parJour(1)),
  perso('chaussettes-bebe', 'Chaussettes bébé', 'bebe', { ages: ['bebe'] }, parJour(1, 0, 8, 0.5)),
  achetable(perso('couches', 'Couches', 'bebe', { habitudes: ['couches'] }, parJour(6))),
  achetable(perso('lingettes', 'Lingettes / liniment', 'bebe', { habitudes: ['couches'] })),
  achetable(perso('creme-change', 'Crème pour le change', 'bebe', { habitudes: ['couches'] })),
  perso('tapis-change', 'Tapis à langer nomade', 'bebe', { habitudes: ['couches'] }),
  perso('biberons', 'Biberons', 'bebe', { habitudes: ['biberon'] }, fixe(3)),
  achetable(perso('lait', 'Lait infantile', 'bebe', { habitudes: ['biberon'] })),
  achetable(perso('petits-pots', 'Petits pots / repas', 'bebe', { habitudes: ['repas-bebe'] })),
  perso('bavoirs', 'Bavoirs', 'bebe', { habitudes: ['repas-bebe'] }, parJour(1, 0, 6)),
  perso('tire-lait', 'Tire-lait / coussinets d’allaitement', 'bebe', { habitudes: ['allaitement'] }),
  suggestion(perso('coussin-allaitement', 'Coussin d’allaitement', 'bebe', { habitudes: ['allaitement'] })),
  perso('tetine', 'Tétine (+ une de secours)', 'bebe', { habitudes: ['tetine'] }, fixe(2)),
  perso('doudou', 'Doudou', 'bebe', { habitudes: ['doudou'] }),
  suggestion(perso('doudou-secours', 'Doudou de secours', 'bebe', { habitudes: ['doudou'] })),
  perso('porte-bebe', 'Porte-bébé', 'bebe', { ages: ['bebe'] }),
  perso('mouche-bebe', 'Mouche-bébé', 'bebe', { ages: ['bebe'] }),
  suggestion(perso('thermometre-bain', 'Thermomètre de bain', 'bebe', { ages: ['bebe'] })),
  commun('poussette', 'Poussette', 'bebe', { ages: ['bebe'] }),
  commun('lit-parapluie', 'Lit parapluie', 'bebe', {
    ages: ['bebe'],
    hebergements: ['location', 'mobil-home', 'tente', 'famille'],
  }),
  commun('drap-lit-parapluie', 'Drap pour lit parapluie', 'bebe', {
    ages: ['bebe'],
    hebergements: ['location', 'mobil-home', 'tente', 'famille'],
  }),
  commun('goupillon', 'Goupillon + liquide vaisselle pour biberons', 'bebe', { habitudes: ['biberon'] }),
  achetable(commun('sacs-couches', 'Sacs à couches', 'bebe', { habitudes: ['couches'] })),
  suggestion(commun('chauffe-biberon', 'Chauffe-biberon', 'bebe', { habitudes: ['biberon'] })),
  suggestion(commun('siege-auto', 'Siège auto (si location de voiture sur place)', 'bebe', { ages: PETITS, ...AVION_TRAIN })),
  suggestion(commun('chaise-nomade', 'Chaise haute nomade', 'bebe', { ages: ['bebe'] })),
  suggestion(commun('babyphone', 'Babyphone', 'bebe', { ages: ['bebe'] })),
  suggestion(commun('veilleuse', 'Veilleuse', 'bebe', { ages: PETITS })),

  // --- Toilette ---
  perso('brosse-dents', 'Brosse à dents', 'toilette'),
  perso('brosse-cheveux', 'Brosse / peigne', 'toilette', { habitudes: ['cheveux-longs'] }),
  perso('elastiques', 'Élastiques / barrettes', 'toilette', { habitudes: ['cheveux-longs'] }),
  perso('deodorant', 'Déodorant', 'toilette', PLUS_DE_12),
  perso('rasoir', 'Rasoir + mousse / après-rasage', 'toilette', { habitudes: ['rasage'] }),
  perso('maquillage', 'Trousse de maquillage + démaquillant', 'toilette', { habitudes: ['maquillage'] }),
  achetable(perso('protections', 'Protections périodiques', 'toilette', { habitudes: ['protections'] })),
  perso('lentilles', 'Lentilles + produit + étui', 'toilette', { habitudes: ['lentilles'] }),
  perso('baume-levres', 'Baume à lèvres', 'toilette', [{ climats: ['froid'] }, { destinations: ['ski', 'montagne'] }]),
  perso('appareil-dentaire', 'Appareil dentaire + boîte', 'toilette', { habitudes: ['appareil-dentaire'] }),
  suggestion(perso('creme-visage', 'Crème hydratante', 'toilette', PLUS_DE_12)),
  commun('brosse-commune', 'Brosse / peigne', 'toilette'),
  achetable(commun('dentifrice', 'Dentifrice', 'toilette')),
  achetable(commun('gel-douche', 'Gel douche / savon', 'toilette', { sauf: { hebergements: ['hotel'] } })),
  achetable(commun('shampoing', 'Shampoing', 'toilette', { sauf: { hebergements: ['hotel'] } })),
  achetable(commun('apres-shampoing', 'Après-shampoing', 'toilette', { habitudes: ['cheveux-longs'] })),
  commun('coupe-ongles', 'Coupe-ongles / ciseaux à ongles', 'toilette', { nuitsMin: 7 }),
  achetable(commun('mouchoirs', 'Mouchoirs', 'toilette')),
  commun('trousse-transparente', 'Pochette transparente 1 L (liquides en cabine)', 'toilette', {
    transports: ['avion'],
  }),
  commun('serviettes-toilette', 'Serviettes de toilette', 'toilette', CUISINE_SUR_PLACE),
  suggestion(commun('seche-cheveux', 'Sèche-cheveux', 'toilette', { habitudes: ['cheveux-longs'] })),
  suggestion(commun('coton-tiges', 'Cotons-tiges', 'toilette')),
  suggestion(commun('pince-epiler', 'Pince à épiler', 'toilette')),

  // --- Santé ---
  perso('lunettes', 'Lunettes de vue + étui', 'sante', { habitudes: ['lunettes'] }),
  perso('traitement', 'Médicaments du traitement (+ quelques jours de marge)', 'sante', { habitudes: ['traitement'] }),
  perso('antihistaminique', 'Antihistaminique / trousse allergie', 'sante', { habitudes: ['allergies'] }),
  perso('mal-transports', 'Médicaments mal des transports', 'sante', { habitudes: ['mal-transports'] }),
  perso('lunettes-soleil', 'Lunettes de soleil', 'sante', [
    { climats: ['chaud'] },
    { destinations: ['plage', 'ski', 'montagne'] },
  ]),
  suggestion(
    perso('lunettes-rechange', 'Lunettes de rechange', 'sante', [
      { habitudes: ['lunettes'] },
      { habitudes: ['lentilles'] },
    ]),
  ),
  commun('trousse-secours', 'Trousse de secours (pansements, désinfectant, compresses)', 'sante'),
  commun('paracetamol-adulte', 'Paracétamol adulte', 'sante', PLUS_DE_12),
  commun('paracetamol-enfant', 'Paracétamol enfant (sirop + pipette)', 'sante', { ages: PETITS }),
  commun('thermometre', 'Thermomètre', 'sante', { ages: PETITS }),
  achetable(
    commun('creme-solaire', 'Crème solaire (indice 50 pour les enfants)', 'sante', [
      { climats: ['chaud'] },
      { destinations: ['plage', 'ski', 'montagne'] },
    ]),
  ),
  achetable(commun('apres-soleil', 'Après-soleil', 'sante', { destinations: ['plage'] })),
  achetable(
    commun('anti-moustiques', 'Anti-moustiques', 'sante', [
      { climats: ['chaud'] },
      TENTE,
      { destinations: ['campagne'] },
    ]),
  ),
  commun('mal-transports-bateau', 'Médicaments mal des transports', 'sante', { transports: ['bateau'] }),
  commun('anti-diarrheique', 'Anti-diarrhéique / réhydratation', 'sante', HORS_EUROPE),
  achetable(commun('serum-physio', 'Sérum physiologique', 'sante', { ages: PETITS })),
  commun('tire-tiques', 'Tire-tiques', 'sante', [
    { destinations: ['campagne', 'montagne'] },
    { activites: ['randonnee'] },
    TENTE,
  ]),
  suggestion(commun('thermometre-adultes', 'Thermomètre', 'sante', { sauf: { ages: PETITS } })),
  suggestion(commun('creme-piqures', 'Crème apaisante piqûres', 'sante', [{ climats: ['chaud'] }, TENTE])),
  suggestion(commun('gel-hydroalcoolique', 'Gel hydroalcoolique', 'sante')),
  suggestion(commun('bouchons-oreilles', "Bouchons d'oreilles", 'sante')),
  suggestion(commun('arnica', 'Arnica (bosses et coups)', 'sante', { ages: ['enfant'] })),
  suggestion(commun('pansements-ampoules', 'Pansements ampoules', 'sante', { activites: ['randonnee'] })),

  // --- Électronique ---
  perso('chargeur-telephone', 'Chargeur de téléphone', 'electronique', PLUS_DE_12),
  perso('ecouteurs', 'Écouteurs / casque', 'electronique', { ...PLUS_DE_12, ...AVION_TRAIN }),
  perso('console', 'Console / tablette + chargeur', 'electronique', { habitudes: ['jeux-video'] }),
  perso('liseuse', 'Liseuse / livres', 'electronique', { habitudes: ['lecture'] }),
  perso('appareil-photo', 'Appareil photo + chargeur + carte mémoire', 'electronique', { habitudes: ['photo'] }),
  perso('ordinateur', 'Ordinateur + chargeur', 'electronique', { activites: ['travail'] }),
  suggestion(perso('ecouteurs-s', 'Écouteurs / casque', 'electronique', { ...PLUS_DE_12, sauf: AVION_TRAIN })),
  commun('batterie-externe', 'Batterie externe', 'electronique', [AVION_TRAIN, { activites: ['randonnee'] }]),
  commun('multiprise', 'Multiprise', 'electronique', { hebergements: ['hotel', 'location', 'mobil-home', 'famille'] }),
  commun('adaptateur', 'Adaptateur de prise', 'electronique', HORS_EUROPE),
  commun('lampe-frontale', 'Lampe frontale / torche', 'electronique', [TENTE, { activites: ['randonnee'] }]),
  suggestion(
    commun('batterie-externe-s', 'Batterie externe', 'electronique', {
      sauf: [AVION_TRAIN, { activites: ['randonnee'] }],
    }),
  ),
  suggestion(
    commun('adaptateur-s', 'Adaptateur de prise (Royaume-Uni, Irlande, Malte, Chypre, Suisse)', 'electronique', EUROPE),
  ),
  suggestion(commun('enceinte', 'Enceinte Bluetooth', 'electronique')),
  suggestion(
    commun('lampe-frontale-s', 'Lampe frontale / torche', 'electronique', {
      sauf: [TENTE, { activites: ['randonnee'] }],
    }),
  ),

  // --- Trajet ---
  perso('gourde', 'Gourde', 'voyage', [
    { ...NON_BEBE, climats: ['chaud'] },
    { ...NON_BEBE, destinations: ['plage'] },
    { ...NON_BEBE, activites: ['randonnee'] },
  ]),
  perso('sac-a-dos-rando', 'Sac à dos de randonnée', 'voyage', { ...NON_BEBE, activites: ['randonnee'] }),
  perso('occupations-trajet', 'Occupations pour le trajet (livres, jeux, coloriage)', 'voyage', { ages: ['enfant'] }),
  perso('tenue-rechange', 'Tenue de rechange dans le sac du trajet', 'voyage', { ages: PETITS }),
  perso('sacs-vomi', 'Sacs (mal des transports)', 'voyage', { habitudes: ['mal-transports'] }),
  suggestion(perso('oreiller-voyage', 'Coussin de voyage', 'voyage', { ...PLUS_DE_12, ...AVION_TRAIN })),
  suggestion(
    perso('gourde-s', 'Gourde', 'voyage', {
      ...NON_BEBE,
      sauf: [{ climats: ['chaud'] }, { destinations: ['plage'] }, { activites: ['randonnee'] }],
    }),
  ),
  commun('sac-a-dos', 'Sac à dos de journée', 'voyage', { sauf: { activites: ['randonnee'] } }),
  commun('encas-trajet', 'Encas et boissons pour le trajet', 'voyage'),
  commun('sacs-vomi-bateau', 'Sacs (mal des transports)', 'voyage', { transports: ['bateau'] }),
  commun('etiquettes-bagages', 'Étiquettes bagages', 'voyage', { transports: ['avion'] }),
  commun('glaciere', 'Glacière', 'voyage', [{ transports: ['voiture'], climats: ['chaud'] }, TENTE]),
  commun('sac-linge-sale', 'Sac à linge sale', 'voyage'),
  suggestion(commun('cadenas', 'Cadenas de valise', 'voyage', { transports: ['avion'] })),
  suggestion(commun('pese-bagage', 'Pèse-bagage', 'voyage', { transports: ['avion'] })),
  suggestion(commun('sacs-plastique', 'Sacs plastique / congélation', 'voyage')),

  // --- Sur place ---
  commun('draps', 'Draps et housses de couette', 'maison', LOGEMENT_A_EQUIPER),
  commun('torchons', 'Torchons / éponge', 'maison', CUISINE_SUR_PLACE),
  achetable(commun('liquide-vaisselle', 'Liquide vaisselle / pastilles lave-vaisselle', 'maison', CUISINE_SUR_PLACE)),
  achetable(commun('lessive', 'Lessive (quelques dosettes)', 'maison', { machineALaver: true })),
  commun('epices', 'Sel, poivre, huile, café, épices de base', 'maison', CUISINE_SUR_PLACE),
  commun('sac-courses', 'Sacs de courses', 'maison', CUISINE_SUR_PLACE),
  commun('couteau', 'Couteau suisse / couteau de cuisine', 'maison', TENTE),
  commun('tire-bouchon', 'Tire-bouchon / décapsuleur', 'maison', TENTE),
  commun('pinces-linge', 'Pinces à linge / corde', 'maison', TENTE),
  commun('tente', 'Tente + piquets + maillet', 'maison', TENTE),
  commun('sacs-couchage', 'Sacs de couchage', 'maison', TENTE, PAR_PARTICIPANT),
  commun('matelas', 'Matelas gonflables + gonfleur', 'maison', TENTE, PAR_PARTICIPANT),
  commun('oreillers', 'Oreillers', 'maison', TENTE, PAR_PARTICIPANT),
  commun('rechaud', 'Réchaud + cartouche de gaz', 'maison', TENTE),
  commun('vaisselle-camping', 'Vaisselle de camping', 'maison', TENTE),
  commun('table-chaises', 'Table et chaises pliantes', 'maison', TENTE),
  commun('rallonge', 'Rallonge électrique', 'maison', TENTE),
  commun('cadeau-hotes', 'Petit cadeau pour les hôtes', 'maison', { hebergements: ['famille'] }),
  suggestion(commun('couteau-s', 'Couteau de cuisine', 'maison', LOGEMENT_A_EQUIPER)),
  suggestion(commun('tire-bouchon-s', 'Tire-bouchon / décapsuleur', 'maison', LOGEMENT_A_EQUIPER)),
  suggestion(commun('pinces-linge-s', 'Pinces à linge', 'maison', { destinations: ['plage'], sauf: TENTE })),
  suggestion(commun('sacs-poubelle', 'Sacs poubelle', 'maison', LOGEMENT_A_EQUIPER)),
  suggestion(commun('papier-toilette', 'Papier toilette / essuie-tout', 'maison', LOGEMENT_A_EQUIPER)),

  // --- Plage ---
  perso('maillot', 'Maillot de bain', 'plage', NAGE, fixe(2)),
  perso('serviette-plage', 'Serviette de plage', 'plage', NAGE),
  perso('tshirt-anti-uv', 'T-shirt anti-UV', 'plage', { destinations: ['plage'], ages: PETITS }),
  perso(
    'brassards',
    'Brassards / gilet de natation',
    'plage',
    NAGE.map((c) => ({ ...c, habitudes: ['ne-nage-pas' as const] })),
  ),
  achetable(
    perso(
      'couches-bain',
      'Couches de bain',
      'plage',
      NAGE.map((c) => ({ ...c, habitudes: ['couches' as const] })),
      parJour(1, 0, 6),
    ),
  ),
  perso('masque-tuba', 'Masque + tuba + palmes', 'plage', { activites: ['plongee'] }),
  suggestion(perso('chaussures-eau', "Chaussures d'eau", 'plage', { destinations: ['plage'], ages: PETITS })),
  commun('parasol', 'Parasol / tente anti-UV', 'plage', { destinations: ['plage'] }),
  commun('jeux-plage', 'Seau, pelle, râteau', 'plage', { destinations: ['plage'], ages: PETITS }),
  commun('sac-plage', 'Sac de plage', 'plage', { destinations: ['plage'] }),
  suggestion(commun('pochette-etanche', 'Pochette étanche pour téléphone', 'plage', NAGE)),
  suggestion(
    commun('ballon', 'Ballon / raquettes de plage', 'loisirs', [
      { destinations: ['plage'] },
      { ages: ['enfant', 'ado'] },
    ]),
  ),
  suggestion(commun('bouee', 'Bouée', 'plage', NAGE)),
  suggestion(commun('natte', 'Natte de plage', 'plage', { destinations: ['plage'] })),

  // --- Montagne / ski / rando ---
  perso('tenue-ski', 'Tenue de ski (pantalon + blouson ou combinaison)', 'montagne', SKIEUR),
  perso('combinaison-neige', 'Combinaison de neige', 'montagne', { destinations: ['ski'], ages: ['bebe'] }),
  perso('gants-ski', 'Gants de ski (+ une paire de rechange)', 'montagne', SKIEUR, fixe(2)),
  perso('chaussettes-ski', 'Chaussettes de ski', 'montagne', SKIEUR, parJour(0.5, 1, 4)),
  perso('casque-ski', 'Casque de ski', 'montagne', SKIEUR),
  perso('masque-ski', 'Masque de ski', 'montagne', SKIEUR),
  perso('apres-ski', 'Après-ski / bottes de neige', 'montagne', { destinations: ['ski'] }),
  perso('polaire', 'Polaire', 'montagne', [{ destinations: ['montagne', 'ski'] }, { activites: ['randonnee'] }]),
  suggestion(perso('batons', 'Bâtons de marche', 'montagne', { activites: ['randonnee'], ...PLUS_DE_12 })),
  suggestion(perso('chaufferettes', 'Chaufferettes', 'montagne', { destinations: ['ski'] })),
  commun('carte-rando', 'Carte / appli de randonnée hors ligne', 'montagne', { activites: ['randonnee'] }),
  commun('couverture-survie', 'Couverture de survie', 'montagne', { activites: ['randonnee'] }),
  commun('porte-bebe-rando', 'Porte-bébé de randonnée', 'montagne', { ages: ['bebe'], activites: ['randonnee'] }),
  suggestion(commun('luge', 'Luge', 'montagne', { destinations: ['ski'], ages: ['enfant'] })),

  // --- Loisirs ---
  perso('jouets', 'Quelques jouets', 'loisirs', { ages: PETITS }),
  perso('casque-velo', 'Casque de vélo', 'loisirs', { activites: ['velo'] }),
  perso('tenue-sport', 'Tenue de sport', 'loisirs', { activites: ['sport', 'velo'] }, parJour(0.3, 1, 3)),
  perso('canne-peche', 'Matériel de pêche', 'loisirs', { activites: ['peche'] }),
  commun('jeux-societe', 'Jeux de société / cartes', 'loisirs', { nuitsMin: 3 }),
  commun('antivol', 'Antivol + kit de réparation vélo', 'loisirs', { activites: ['velo'] }),
  suggestion(commun('jumelles', 'Jumelles', 'loisirs', { destinations: ['montagne', 'campagne'] })),

  // --- Check-list voiture (trajet en voiture uniquement) ---
  voiture('gilets', 'Gilets jaunes + triangle'),
  voiture('sieges-auto', 'Sièges auto / rehausseurs installés', { ages: PETITS }),
  voiture('chargeur-voiture', 'Chargeur allume-cigare / câble CarPlay'),
  voiture('badge', 'Badge télépéage'),
  voiture('critair', "Vignette Crit'Air (zones à faibles émissions)"),
  voiture('vignette-autoroute', 'Vignette autoroute (Suisse, Autriche…)', EUROPE),
  voiture('pneus', 'Pression des pneus et niveaux'),
  voiture('porte-velos', 'Porte-vélos fixé', { activites: ['velo'] }),
];
