import { describe, expect, it } from 'vitest';
import { CATALOGUE } from './catalogue';
import {
  calculerQuantite,
  fusionner,
  genererArticles,
  progression,
  responsable,
  trancheAge,
} from './generer';
import { ParametresVoyage, Profil } from './types';

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
const maman = profil('maman', 1987, { habitudes: ['maquillage'] });
const lea = profil('lea', 2018, { habitudes: ['doudou'] });
const bebe = profil('bebe', 2025);
const famille = [papa, maman, lea, bebe];

const plage: ParametresVoyage = {
  nom: 'Biarritz',
  depart: '2026-07-10',
  nuits: 7,
  destinations: ['plage'],
  climat: 'chaud',
  etranger: false,
  transports: ['voiture'],
  hebergement: 'location',
  machineALaver: false,
  activites: [],
  participants: famille.map((p) => p.id),
};

const noms = (articles: { nom: string }[]) => articles.map((a) => a.nom);
const de = (articles: ReturnType<typeof genererArticles>, proprietaire: string) =>
  articles.filter((a) => a.proprietaire === proprietaire);

describe('catalogue', () => {
  it('a des identifiants uniques', () => {
    const ids = CATALOGUE.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('trancheAge', () => {
  it("calcule la tranche à la date du départ", () => {
    expect(trancheAge(2025, '2026-07-10')).toBe('bebe');
    expect(trancheAge(2018, '2026-07-10')).toBe('enfant');
    expect(trancheAge(2012, '2026-07-10')).toBe('ado');
    expect(trancheAge(1985, '2026-07-10')).toBe('adulte');
    expect(trancheAge(1950, '2026-07-10')).toBe('senior');
  });
});

describe('calculerQuantite', () => {
  it('compte nuits + 1 jours', () => {
    expect(calculerQuantite({ type: 'parJour', ratio: 1, plus: 1 }, 7, false)).toBe(9);
  });
  it('plafonne à 7 jours avec une machine à laver', () => {
    expect(calculerQuantite({ type: 'parJour', ratio: 1, plus: 1 }, 20, true)).toBe(8);
  });
  it('respecte le maximum et le minimum de 1', () => {
    expect(calculerQuantite({ type: 'parJour', ratio: 0.3, plus: 1, max: 3 }, 30, false)).toBe(3);
    expect(calculerQuantite({ type: 'parJour', ratio: 0.1 }, 0, false)).toBe(1);
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
    expect(noms(articles)).not.toContain('Combinaison / pantalon de ski');
    expect(noms(articles)).not.toContain('Tente + piquets + maillet');
  });

  it('suit les habitudes de chaque personne', () => {
    expect(noms(de(articles, 'papa'))).toContain('Rasoir / tondeuse');
    expect(noms(de(articles, 'maman'))).not.toContain('Rasoir / tondeuse');
    expect(noms(de(articles, 'maman'))).toContain('Trousse de maquillage');
    expect(noms(de(articles, 'lea'))).toContain('Doudou');
  });

  it("suit l'âge", () => {
    expect(noms(de(articles, 'bebe'))).toContain('Couches');
    expect(noms(de(articles, 'bebe'))).not.toContain('Brosse à dents');
    expect(noms(de(articles, 'lea'))).not.toContain('Permis de conduire');
    expect(noms(de(articles, 'papa'))).toContain('Permis de conduire');
  });

  it("ajoute les affaires communes liées à l'âge d'un participant", () => {
    expect(noms(de(articles, 'commun'))).toContain('Lit parapluie');
    const sansBebe = genererArticles({ ...plage, participants: ['papa', 'maman'] }, famille, CATALOGUE);
    expect(noms(sansBebe)).not.toContain('Lit parapluie');
  });

  it('calcule les quantités selon la durée', () => {
    const slips = de(articles, 'papa').find((a) => a.nom === 'Sous-vêtements');
    expect(slips?.quantite).toBe(9);
  });

  it('ajoute les articles perso du profil', () => {
    const avecOreiller = [{ ...papa, articlesPerso: [{ id: 'o', nom: 'Mon oreiller', categorie: 'maison' as const, quantite: 1 }] }];
    const liste = genererArticles({ ...plage, participants: ['papa'] }, avecOreiller, CATALOGUE);
    expect(liste.find((a) => a.nom === 'Mon oreiller')?.origine).toBe('perso');
  });

  it("ajoute le passeport à l'étranger", () => {
    const etranger = genererArticles({ ...plage, etranger: true }, famille, CATALOGUE);
    expect(de(etranger, 'bebe').map((a) => a.nom)).toContain('Passeport');
  });

  it('ne génère rien sans participant', () => {
    expect(genererArticles({ ...plage, participants: [] }, famille, CATALOGUE)).toEqual([]);
  });
});

describe('fusionner', () => {
  it('garde le pointage, les quantités ajustées et les ajouts', () => {
    const avant = genererArticles(plage, famille, CATALOGUE);
    const maillot = avant.find((a) => a.id === 'lea:maillot')!;
    maillot.statut = 'dans-valise';
    const slips = avant.find((a) => a.id === 'papa:sous-vetements')!;
    slips.quantite = 4;
    slips.ajuste = true;
    avant.push({ id: 'x', nom: 'Cerf-volant', categorie: 'loisirs', proprietaire: 'commun', quantite: 1, statut: 'a-prendre', origine: 'ajout' });

    const plusLong = { ...plage, nuits: 14 };
    const apres = fusionner(avant, genererArticles(plusLong, famille, CATALOGUE), plusLong.participants);

    expect(apres.find((a) => a.id === 'lea:maillot')?.statut).toBe('dans-valise');
    expect(apres.find((a) => a.id === 'papa:sous-vetements')?.quantite).toBe(4);
    expect(apres.find((a) => a.id === 'maman:sous-vetements')?.quantite).toBe(16);
    expect(apres.find((a) => a.id === 'x')).toBeDefined();
  });
});

describe('progression', () => {
  it('ignore les articles « pas besoin »', () => {
    const base = { categorie: 'vetements' as const, proprietaire: 'papa', quantite: 1, origine: 'catalogue' as const };
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
