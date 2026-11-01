import { describe, expect, it } from 'vitest';
import { CATALOGUE } from './catalogue';
import {
  calculerQuantite,
  exclureMotif,
  fusionner,
  genererArticles,
  genererSuggestions,
  HABITUDES_PAR_AGE,
  habitudesParDefaut,
  habitudesProposees,
  progression,
  responsable,
  trancheAge,
} from './generer';
import { ArticleVoyage, ParametresVoyage, Profil } from './types';

const profil = (id: string, anneeNaissance: number, extra: Partial<Profil> = {}): Profil => ({
  id,
  prenom: id,
  anneeNaissance,
  habitudes: [],
  responsabilites: [],
  articlesPerso: [],
  ...extra,
});

const papa = profil('papa', 1985, { habitudes: ['rasage', 'lunettes'], responsabilites: ['papiers'] });
const maman = profil('maman', 1987, { habitudes: ['maquillage', 'cheveux-longs'] });
const lea = profil('lea', 2019, { habitudes: ['doudou'] });
const bebe = profil('bebe', 2025, { habitudes: ['couches', 'biberon', 'ne-nage-pas'] });
const famille = [papa, maman, lea, bebe];

const plage: ParametresVoyage = {
  nom: 'Biarritz',
  depart: '2027-07-10',
  nuits: 7,
  destinations: ['plage'],
  climat: 'chaud',
  zone: 'france',
  transports: ['voiture'],
  hebergement: 'location',
  machineALaver: false,
  activites: ['baignade'],
  participants: famille.map((p) => p.id),
};

const ski: ParametresVoyage = {
  ...plage,
  nom: 'Ski',
  destinations: ['ski'],
  climat: 'froid',
  activites: [],
};

type Liste = ReturnType<typeof genererArticles>;
const noms = (articles: { nom: string }[]) => articles.map((a) => a.nom);
const de = (articles: Liste, proprietaire: string) => articles.filter((a) => a.proprietaire === proprietaire);
const trouve = (articles: Liste, id: string) => articles.find((a) => a.id === id);

describe('catalogue', () => {
  it('a des identifiants uniques', () => {
    const ids = CATALOGUE.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('trancheAge', () => {
  it('calcule la tranche à la date du départ', () => {
    expect(trancheAge(2025, '2027-07-10')).toBe('bebe');
    expect(trancheAge(2019, '2027-07-10')).toBe('enfant');
    expect(trancheAge(2012, '2027-07-10')).toBe('ado');
    expect(trancheAge(1985, '2027-07-10')).toBe('adulte');
    expect(trancheAge(1950, '2027-07-10')).toBe('senior');
  });
});

describe('habitudesParDefaut', () => {
  it('pré-coche couches, biberon et natation selon l’âge', () => {
    expect(habitudesParDefaut(2026, 2027)).toEqual(['couches', 'biberon', 'ne-nage-pas']);
    expect(habitudesParDefaut(2023, 2027)).toEqual(['ne-nage-pas']);
    expect(habitudesParDefaut(2015, 2027)).toEqual([]);
  });
});

describe('calculerQuantite', () => {
  const v = { ...plage, climat: 'tempere' as const };
  it('compte nuits + 1 jours', () => {
    expect(calculerQuantite({ type: 'parJour', ratio: 1, plus: 1 }, v, 4)).toBe(9);
  });
  it('plafonne à 7 jours avec une machine à laver', () => {
    expect(calculerQuantite({ type: 'parJour', ratio: 1 }, { ...v, nuits: 20, machineALaver: true }, 4)).toBe(7);
  });
  it('respecte le maximum et le minimum de 1', () => {
    expect(calculerQuantite({ type: 'parJour', ratio: 0.3, plus: 1, max: 3 }, { ...v, nuits: 30 }, 4)).toBe(3);
    expect(calculerQuantite({ type: 'parJour', ratio: 0.1 }, { ...v, nuits: 0 }, 4)).toBe(1);
  });
  it('applique le ratio « au chaud »', () => {
    expect(calculerQuantite({ type: 'parJour', ratio: 1, auChaud: 0.5 }, plage, 4)).toBe(4);
    expect(calculerQuantite({ type: 'parJour', ratio: 1, auChaud: 0.5 }, v, 4)).toBe(8);
  });
  it('gère les quantités par climat et par participant', () => {
    const pull = { type: 'parClimat', chaud: 1, tempere: 2, froid: 3 } as const;
    expect(calculerQuantite(pull, plage, 4)).toBe(1);
    expect(calculerQuantite(pull, ski, 4)).toBe(3);
    expect(calculerQuantite({ type: 'parParticipant' }, plage, 4)).toBe(4);
  });
});

describe('genererArticles', () => {
  const articles = genererArticles(plage, famille, CATALOGUE);

  it('ajoute les articles de plage', () => {
    expect(noms(de(articles, 'lea'))).toContain('Maillot de bain');
    expect(noms(de(articles, 'commun'))).toContain('Parasol / tente anti-UV');
  });

  it("n'ajoute pas ce qui ne correspond pas au voyage", () => {
    expect(noms(articles)).not.toContain('Passeport');
    expect(noms(articles)).not.toContain('Tenue de ski (pantalon + blouson ou combinaison)');
    expect(noms(articles)).not.toContain('Tente + piquets + maillet');
  });

  it('suit les habitudes de chaque personne', () => {
    expect(noms(de(articles, 'papa'))).toContain('Rasoir + mousse / après-rasage');
    expect(noms(de(articles, 'maman'))).not.toContain('Rasoir + mousse / après-rasage');
    expect(noms(de(articles, 'maman'))).toContain('Trousse de maquillage + démaquillant');
    expect(noms(de(articles, 'lea'))).toContain('Doudou');
    expect(noms(de(articles, 'bebe'))).toContain('Biberons');
    expect(noms(de(articles, 'bebe'))).toContain('Brassards / gilet de natation');
    expect(noms(de(articles, 'lea'))).not.toContain('Brassards / gilet de natation');
  });

  it("suit l'âge", () => {
    expect(noms(de(articles, 'bebe'))).toContain('Bodies');
    expect(noms(de(articles, 'bebe'))).toContain('Brosse à dents');
    expect(noms(de(articles, 'lea'))).not.toContain('Permis de conduire');
    expect(noms(de(articles, 'papa'))).toContain('Permis de conduire');
    expect(noms(de(articles, 'lea'))).not.toContain('Carte Vitale');
  });

  it("n'exige la carte d'identité des enfants qu'en avion ou hors de France", () => {
    expect(trouve(articles, 'lea:carte-identite')).toBeUndefined();
    expect(
      trouve(genererArticles({ ...plage, transports: ['avion'] }, famille, CATALOGUE), 'lea:carte-identite'),
    ).toBeDefined();
  });

  it("ajoute les affaires communes liées à l'âge d'un participant", () => {
    expect(noms(de(articles, 'commun'))).toContain('Lit parapluie');
    const sansBebe = genererArticles({ ...plage, participants: ['papa', 'maman'] }, famille, CATALOGUE);
    expect(noms(sansBebe)).not.toContain('Lit parapluie');
  });

  it('calcule les quantités selon la durée, l’âge et le climat', () => {
    expect(trouve(articles, 'papa:sous-vetements')?.quantite).toBe(8);
    expect(trouve(articles, 'lea:sous-vetements-enfant')?.quantite).toBe(10);
    expect(trouve(articles, 'papa:chaussettes')?.quantite).toBe(4);
    expect(trouve(articles, 'papa:pull')?.quantite).toBe(1);
    expect(trouve(articles, 'papa:pyjama')?.quantite).toBe(2);
    expect(trouve(genererArticles({ ...plage, nuits: 3 }, famille, CATALOGUE), 'papa:pyjama')?.quantite).toBe(1);
  });

  it('ajoute les articles perso du profil', () => {
    const avecOreiller = [
      { ...papa, articlesPerso: [{ id: 'o', nom: 'Mon oreiller', categorie: 'maison' as const, quantite: 1 }] },
    ];
    const liste = genererArticles({ ...plage, participants: ['papa'] }, avecOreiller, CATALOGUE);
    expect(liste.find((a) => a.nom === 'Mon oreiller')?.origine).toBe('perso');
  });

  it('distingue France, Europe et hors Europe', () => {
    const europe = genererArticles({ ...plage, zone: 'europe' }, famille, CATALOGUE);
    const loin = genererArticles({ ...plage, zone: 'hors-europe' }, famille, CATALOGUE);
    expect(noms(de(europe, 'papa'))).not.toContain('Passeport');
    expect(noms(de(europe, 'papa'))).toContain("Carte européenne d'assurance maladie");
    expect(noms(de(loin, 'bebe'))).toContain('Passeport');
    expect(noms(loin)).toContain('Adaptateur de prise');
    expect(noms(europe)).not.toContain('Adaptateur de prise');
  });

  it('ne double pas gants et bonnet au ski, sauf pour le bébé', () => {
    const liste = genererArticles(ski, famille, CATALOGUE);
    expect(noms(de(liste, 'papa'))).toContain('Gants de ski (+ une paire de rechange)');
    expect(noms(de(liste, 'papa'))).not.toContain('Gants');
    expect(noms(de(liste, 'bebe'))).toContain('Gants');
    expect(noms(de(liste, 'bebe'))).toContain('Combinaison de neige');
    expect(noms(de(liste, 'bebe'))).not.toContain('Casque de ski');
    expect(trouve(liste, 'papa:pull')?.quantite).toBe(3);
  });

  it('met les sacs de couchage à 1 par participant en camping', () => {
    const liste = genererArticles({ ...plage, hebergement: 'tente' }, famille, CATALOGUE);
    expect(trouve(liste, 'commun:sacs-couchage')?.quantite).toBe(4);
    expect(trouve(genererArticles(plage, famille, CATALOGUE), 'commun:sacs-couchage')).toBeUndefined();
  });

  it('range le gel douche et le shampoing à part à l’hôtel', () => {
    const hotel = genererArticles({ ...plage, hebergement: 'hotel' }, famille, CATALOGUE);
    expect(noms(hotel)).not.toContain('Shampoing');
    expect(noms(articles)).toContain('Shampoing');
  });

  it('ne génère rien sans participant', () => {
    expect(genererArticles({ ...plage, participants: [] }, famille, CATALOGUE)).toEqual([]);
  });
});

describe('listes valise / courses / voiture', () => {
  it('garde tout dans la valise en voiture, avec une check-list voiture', () => {
    const liste = genererArticles(plage, famille, CATALOGUE);
    expect(trouve(liste, 'bebe:couches')?.liste).toBe('valise');
    expect(trouve(liste, 'commun:gilets')?.liste).toBe('voiture');
    expect(trouve(liste, 'commun:sieges-auto')?.liste).toBe('voiture');
  });

  it('passe les articles achetables en liste de courses en avion, sans check-list voiture', () => {
    const liste = genererArticles({ ...plage, transports: ['avion'] }, famille, CATALOGUE);
    expect(trouve(liste, 'bebe:couches')?.liste).toBe('courses');
    expect(trouve(liste, 'commun:creme-solaire')?.liste).toBe('courses');
    expect(trouve(liste, 'bebe:bodies')?.liste).toBe('valise');
    expect(liste.filter((a) => a.liste === 'voiture')).toEqual([]);
  });
});

describe('genererSuggestions', () => {
  it('propose les suggestions du voyage qui ne sont pas déjà dans la liste', () => {
    const articles = genererArticles(plage, famille, CATALOGUE);
    const suggestions = genererSuggestions(plage, famille, CATALOGUE, articles);
    expect(noms(suggestions)).toContain("Chaussures d'eau");
    expect(noms(suggestions)).toContain('Enceinte Bluetooth');
    expect(noms(suggestions)).not.toContain('Cadenas de valise');
    expect(suggestions.every((s) => s.origine === 'suggestion')).toBe(true);

    const ajoutee = suggestions.find((s) => s.nom === 'Enceinte Bluetooth')!;
    expect(noms(genererSuggestions(plage, famille, CATALOGUE, [...articles, ajoutee]))).not.toContain(
      'Enceinte Bluetooth',
    );
  });

  it("ne propose pas la suggestion quand l'article est déjà mis d'office", () => {
    const articles = genererArticles(plage, famille, CATALOGUE);
    expect(noms(genererSuggestions(plage, famille, CATALOGUE, articles))).not.toContain('Thermomètre');
    const adultes = { ...plage, participants: ['papa', 'maman'] };
    expect(
      noms(genererSuggestions(adultes, famille, CATALOGUE, genererArticles(adultes, famille, CATALOGUE))),
    ).toContain('Thermomètre');
  });
});

describe('fusionner', () => {
  it('garde le pointage, les choix manuels, les ajouts et les suggestions ajoutées', () => {
    const avant = genererArticles(plage, famille, CATALOGUE);
    const maillot = trouve(avant, 'lea:maillot')!;
    maillot.statut = 'dans-valise';
    maillot.pointePar = 'maman@example.com';
    const slips = trouve(avant, 'papa:sous-vetements')!;
    slips.quantite = 4;
    slips.ajuste = true;
    const couches = trouve(avant, 'bebe:couches')!;
    couches.liste = 'courses';
    couches.listeChoisie = true;
    const ajout: ArticleVoyage = {
      id: 'x',
      nom: 'Cerf-volant',
      categorie: 'loisirs',
      proprietaire: 'commun',
      quantite: 1,
      statut: 'a-prendre',
      liste: 'valise',
      origine: 'ajout',
    };
    const suggestion = genererSuggestions(plage, famille, CATALOGUE, avant).find(
      (s) => s.nom === 'Enceinte Bluetooth',
    )!;
    avant.push(ajout, suggestion);

    const plusLong = { ...plage, nuits: 14 };
    const apres = fusionner(avant, genererArticles(plusLong, famille, CATALOGUE), plusLong.participants);

    expect(trouve(apres, 'lea:maillot')?.statut).toBe('dans-valise');
    expect(trouve(apres, 'lea:maillot')?.pointePar).toBe('maman@example.com');
    expect(trouve(apres, 'papa:sous-vetements')).not.toHaveProperty('pointePar');
    expect(trouve(apres, 'papa:sous-vetements')?.quantite).toBe(4);
    expect(trouve(apres, 'maman:sous-vetements')?.quantite).toBe(15);
    expect(trouve(apres, 'bebe:couches')?.liste).toBe('courses');
    expect(trouve(apres, 'x')).toBeDefined();
    expect(trouve(apres, suggestion.id)).toBeDefined();
  });
});

describe('progression', () => {
  it('ignore les articles « pas besoin »', () => {
    const base = {
      categorie: 'vetements' as const,
      proprietaire: 'papa',
      quantite: 1,
      liste: 'valise' as const,
      origine: 'catalogue' as const,
    };
    expect(
      progression([
        { ...base, id: '1', nom: 'a', statut: 'dans-valise' },
        { ...base, id: '2', nom: 'b', statut: 'a-prendre' },
        { ...base, id: '3', nom: 'c', statut: 'pas-besoin' },
      ]),
    ).toEqual({ total: 2, faits: 1, restants: 1 });
  });
});

describe('responsable', () => {
  it('trouve la personne qui gère une catégorie', () => {
    expect(responsable('papiers', famille, plage.participants)?.id).toBe('papa');
    expect(responsable('papiers', famille, ['maman'])).toBeUndefined();
  });
});

describe('effet du tri sur Biarritz', () => {
  it('reste sous les 150 lignes dans la valise', () => {
    const valise = genererArticles(plage, famille, CATALOGUE).filter((a) => a.liste === 'valise');
    expect(valise.length).toBeLessThan(150);
  });
});

describe('HABITUDES_PAR_AGE', () => {
  it('ne propose pas les habitudes de bébé à un adulte, ni le rasage à un bébé', () => {
    expect(HABITUDES_PAR_AGE.adulte).not.toContain('couches');
    expect(HABITUDES_PAR_AGE.adulte).not.toContain('biberon');
    expect(HABITUDES_PAR_AGE.adulte).toContain('lunettes');
    expect(HABITUDES_PAR_AGE.bebe).toContain('couches');
    expect(HABITUDES_PAR_AGE.bebe).not.toContain('rasage');
  });

  it('couvre toutes les habitudes pré-cochées selon l’âge', () => {
    for (const [annee, tranche] of [
      [2026, 'bebe'],
      [2023, 'enfant'],
    ] as const) {
      for (const h of habitudesParDefaut(annee, 2026)) expect(HABITUDES_PAR_AGE[tranche]).toContain(h);
    }
  });
});

describe('sexe', () => {
  const julie = profil('julie', 1987, { sexe: 'F' });
  const paul = profil('paul', 1985, { sexe: 'M' });
  const camille = profil('camille', 1990);
  const trio = [julie, paul, camille];
  const liste = genererArticles({ ...plage, participants: trio.map((p) => p.id) }, trio, CATALOGUE);

  it('propose robes / jupes aux filles et femmes seulement', () => {
    expect(noms(de(liste, 'julie'))).toContain('Robes / jupes');
    expect(noms(de(liste, 'julie'))).not.toContain('Shorts / bermudas');
    expect(noms(de(liste, 'paul'))).not.toContain('Robes / jupes');
    expect(noms(de(liste, 'paul'))).toContain('Shorts / bermudas');
  });

  it('sans sexe précisé, garde le comportement neutre', () => {
    expect(noms(de(liste, 'camille'))).toContain('Shorts / bermudas');
    expect(noms(de(liste, 'camille'))).not.toContain('Robes / jupes');
  });

  it('ne propose pas maquillage et protections à un garçon ou un homme', () => {
    expect(habitudesProposees('adulte', 'M')).not.toContain('maquillage');
    expect(habitudesProposees('adulte', 'M')).not.toContain('protections');
    expect(habitudesProposees('adulte', 'M')).toContain('rasage');
    expect(habitudesProposees('adulte', 'F')).toContain('maquillage');
    expect(habitudesProposees('adulte')).toContain('maquillage');
  });
});

describe('baignade sans plage', () => {
  const seul = [profil('m', 1975)];
  const ville = { ...plage, destinations: ['ville' as const], activites: ['baignade' as const], participants: ['m'] };
  const nomsDe = (v: ParametresVoyage) => noms(genererArticles(v, seul, CATALOGUE));
  const suggestionsDe = (v: ParametresVoyage) =>
    noms(genererSuggestions(v, seul, CATALOGUE, genererArticles(v, seul, CATALOGUE)));

  it('ajoute maillot et serviette de baignade en location', () => {
    expect(nomsDe(ville)).toContain('Maillot de bain');
    expect(nomsDe(ville)).toContain('Serviette de baignade');
  });

  it("met la serviette en suggestion à l'hôtel, sauf à la plage", () => {
    const hotel = { ...ville, hebergement: 'hotel' as const };
    expect(nomsDe(hotel)).toContain('Maillot de bain');
    expect(nomsDe(hotel)).not.toContain('Serviette de baignade');
    expect(suggestionsDe(hotel)).toContain('Serviette de baignade');
    const hotelPlage = { ...hotel, destinations: ['plage' as const] };
    expect(nomsDe(hotelPlage)).toContain('Serviette de baignade');
    expect(suggestionsDe(hotelPlage)).not.toContain('Serviette de baignade');
  });

  it('sans plage ni baignade, ni maillot ni serviette', () => {
    const sec = { ...ville, activites: [] };
    expect(nomsDe(sec)).not.toContain('Maillot de bain');
    expect(nomsDe(sec)).not.toContain('Serviette de baignade');
  });
});

describe('motif du voyage', () => {
  // Déplacement de 3 nuits à Valence, seul, à l'hôtel, en train.
  const valence: ParametresVoyage = {
    motif: 'travail',
    nom: 'Valence',
    depart: '2027-03-10',
    nuits: 3,
    destinations: ['ville'],
    climat: 'tempere',
    zone: 'europe',
    transports: ['train'],
    hebergement: 'hotel',
    machineALaver: false,
    activites: [],
    participants: ['papa'],
  };
  const liste = genererArticles(valence, famille, CATALOGUE);
  const ids = liste.map((a) => a.id);

  it('retire les loisirs et le plein air en voyage de travail', () => {
    for (const absent of [
      'papa:shorts',
      'papa:veste-legere',
      'papa:impermeable',
      'commun:sac-a-dos',
      'commun:jeux-societe',
    ]) {
      expect(ids).not.toContain(absent);
    }
  });

  it('ajoute ce qui sert au travail, et garde le pyjama', () => {
    expect(ids).toEqual(expect.arrayContaining(['papa:ordinateur', 'papa:stylo-bloc', 'papa:pyjama']));
    const suggestions = genererSuggestions(valence, famille, CATALOGUE, liste).map((a) => a.id);
    expect(suggestions).toContain('papa:costume');
    expect(suggestions).not.toContain('commun:enceinte');
  });

  it('garde des pantalons en travail, même au chaud', () => {
    expect(trouve(liste, 'papa:pantalons')?.quantite).toBe(2);
    const auChaud = genererArticles({ ...valence, climat: 'chaud' }, famille, CATALOGUE);
    expect(trouve(auChaud, 'papa:pantalons')?.quantite).toBe(2);
    expect(trouve(auChaud, 'papa:sandales')).toBeUndefined();
  });

  it('ne change rien aux vacances (motif absent = vacances)', () => {
    const vacances = genererArticles({ ...valence, motif: undefined }, famille, CATALOGUE).map((a) => a.id);
    expect(vacances).toEqual(expect.arrayContaining(['papa:shorts', 'papa:impermeable', 'commun:sac-a-dos']));
    expect(vacances).not.toContain('papa:ordinateur');
  });

  it('ajoute l’exclusion une seule fois, en gardant les exclusions existantes', () => {
    const une = exclureMotif({ climats: ['chaud'], sauf: { sexes: ['F'] } }, 'travail');
    expect(une).toEqual({ climats: ['chaud'], sauf: [{ sexes: ['F'] }, { motifs: ['travail'] }] });
    expect(exclureMotif(une, 'travail')).toEqual(une);
    expect(exclureMotif(undefined, 'travail')).toEqual({ sauf: { motifs: ['travail'] } });
    expect(exclureMotif([{ climats: ['chaud'] }, { destinations: ['plage'] }], 'travail')).toEqual([
      { climats: ['chaud'], sauf: { motifs: ['travail'] } },
      { destinations: ['plage'], sauf: { motifs: ['travail'] } },
    ]);
  });
});

describe('bas (pantalons, shorts) : un total partagé', () => {
  const quantites = (v: ParametresVoyage, qui: string) => {
    const l = genererArticles(v, famille, CATALOGUE);
    return {
      longs: trouve(l, `${qui}:pantalons`)?.quantite ?? 0,
      courts: (trouve(l, `${qui}:shorts`) ?? trouve(l, `${qui}:shorts-f`))?.quantite ?? 0,
    };
  };
  const tempere3: ParametresVoyage = { ...plage, destinations: ['ville'], climat: 'tempere', nuits: 3, activites: [] };

  it('3 nuits en climat tempéré : 1 pantalon et 1 bermuda (au lieu de 3 + 2)', () => {
    expect(quantites(tempere3, 'papa')).toEqual({ longs: 1, courts: 1 });
    expect(quantites(tempere3, 'maman')).toEqual({ longs: 1, courts: 1 });
  });

  it('une semaine : 4 bas, plutôt courts au chaud, plutôt longs au tempéré', () => {
    expect(quantites({ ...tempere3, nuits: 7 }, 'papa')).toEqual({ longs: 2, courts: 2 });
    expect(quantites({ ...plage, destinations: ['montagne'], activites: [] }, 'papa')).toEqual({ longs: 2, courts: 2 });
    expect(quantites({ ...tempere3, nuits: 8 }, 'papa')).toEqual({ longs: 3, courts: 2 });
    expect(quantites({ ...plage, destinations: ['montagne'], nuits: 8, activites: [] }, 'papa')).toEqual({
      longs: 2,
      courts: 3,
    });
  });

  it('un seul type de bas : il prend tout le total (au moins 2, au plus 6)', () => {
    expect(quantites(plage, 'papa')).toEqual({ longs: 0, courts: 4 });
    expect(quantites({ ...ski, nuits: 1 }, 'papa')).toEqual({ longs: 2, courts: 0 });
    expect(quantites({ ...ski, nuits: 20 }, 'papa')).toEqual({ longs: 6, courts: 0 });
  });

  it('avec une machine à laver, les jours comptés sont plafonnés à 7', () => {
    expect(quantites({ ...ski, nuits: 20, machineALaver: true }, 'papa')).toEqual({ longs: 4, courts: 0 });
  });
});
