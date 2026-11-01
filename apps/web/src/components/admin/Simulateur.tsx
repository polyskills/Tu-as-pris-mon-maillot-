'use client';

import {
  ArticleCatalogue,
  COMMUN,
  genererArticles,
  genererSuggestions,
  ParametresVoyage,
  Profil,
} from '@maillot/domain';
import { useState } from 'react';
import { ChoixUnique } from '@/components/ui';
import { Brouillon } from '@/lib/admin';
import { useStore } from '@/store/store';

// Simulateur : montre pour qui et en quelle quantité l'article apparaît, sur quelques voyages types.

const FAMILLE_TYPE: Profil[] = [
  {
    id: 'papa',
    prenom: 'Papa',
    anneeNaissance: 1985,
    sexe: 'M',
    habitudes: ['lunettes', 'rasage'],
    responsabilites: [],
    articlesPerso: [],
  },
  {
    id: 'maman',
    prenom: 'Maman',
    anneeNaissance: 1987,
    sexe: 'F',
    habitudes: ['maquillage', 'protections', 'cheveux-longs'],
    responsabilites: [],
    articlesPerso: [],
  },
  {
    id: 'ado',
    prenom: 'Hugo (15 ans)',
    anneeNaissance: 2012,
    sexe: 'M',
    habitudes: ['jeux-video'],
    responsabilites: [],
    articlesPerso: [],
  },
  {
    id: 'enfant',
    prenom: 'Léa (7 ans)',
    anneeNaissance: 2020,
    sexe: 'F',
    habitudes: ['doudou', 'lecture'],
    responsabilites: [],
    articlesPerso: [],
  },
  {
    id: 'bebe',
    prenom: 'Tom (1 an)',
    anneeNaissance: 2026,
    sexe: 'M',
    habitudes: ['couches', 'biberon', 'tetine', 'ne-nage-pas'],
    responsabilites: [],
    articlesPerso: [],
  },
  {
    id: 'mamie',
    prenom: 'Mamie',
    anneeNaissance: 1955,
    sexe: 'F',
    habitudes: ['traitement', 'lecture'],
    responsabilites: [],
    articlesPerso: [],
  },
];

type Scenario = Omit<ParametresVoyage, 'participants'>;
const base = { depart: '2027-07-10', machineALaver: false, activites: [] as Scenario['activites'] };

const SCENARIOS: Scenario[] = [
  {
    ...base,
    nom: '🏖️ Plage en France · voiture · location · 7 nuits',
    nuits: 7,
    destinations: ['plage'],
    climat: 'chaud',
    zone: 'france',
    transports: ['voiture'],
    hebergement: 'location',
  },
  {
    ...base,
    nom: '⛷️ Ski · voiture · location · 6 nuits',
    depart: '2027-02-13',
    nuits: 6,
    destinations: ['ski', 'montagne'],
    climat: 'froid',
    zone: 'france',
    transports: ['voiture'],
    hebergement: 'location',
  },
  {
    ...base,
    nom: '🏙️ Week-end en Europe · avion · hôtel · 3 nuits',
    depart: '2027-04-10',
    nuits: 3,
    destinations: ['ville'],
    climat: 'tempere',
    zone: 'europe',
    transports: ['avion'],
    hebergement: 'hotel',
  },
  {
    ...base,
    nom: '⛺ Camping · voiture · tente · 14 nuits · baignade, rando',
    nuits: 14,
    destinations: ['campagne'],
    climat: 'chaud',
    zone: 'france',
    transports: ['voiture'],
    hebergement: 'tente',
    activites: ['baignade', 'randonnee'],
  },
  {
    ...base,
    nom: '🌍 Loin · avion · hôtel · 14 nuits · plongée, machine',
    depart: '2027-08-01',
    nuits: 14,
    destinations: ['plage'],
    climat: 'chaud',
    zone: 'hors-europe',
    transports: ['avion'],
    hebergement: 'hotel',
    activites: ['baignade', 'plongee'],
    machineALaver: true,
  },
  {
    ...base,
    nom: '👵 Chez la famille · train · 4 nuits',
    depart: '2027-12-23',
    nuits: 4,
    destinations: ['ville'],
    climat: 'froid',
    zone: 'france',
    transports: ['train'],
    hebergement: 'famille',
  },
];

const LISTES = { courses: '🛒 courses sur place', voiture: '🚗 check-list voiture', valise: '' } as const;

export function Simulateur({ article }: { article: Brouillon }) {
  const mesProfils = useStore((s) => s.profils);
  const [famille, setFamille] = useState<'type' | 'moi'>('type');
  const profils = famille === 'moi' && mesProfils.length ? mesProfils : FAMILLE_TYPE;
  const catalogue: ArticleCatalogue[] = [{ ...article, id: 'apercu' }];
  const prenom = (id: string) => (id === COMMUN ? 'Commun' : (profils.find((p) => p.id === id)?.prenom ?? id));

  return (
    <div className="flex flex-col gap-3">
      {mesProfils.length > 0 && (
        <ChoixUnique options={{ type: 'Famille type', moi: 'Ma famille' }} valeur={famille} onChange={setFamille} />
      )}
      <p className="text-sm text-discret">
        {profils.map((p) => p.prenom).join(', ')}
        {article.mode === 'suggestion' && ' · article proposé en suggestion'}
      </p>
      <ul className="flex flex-col divide-y divide-bordure">
        {SCENARIOS.map((s) => {
          const v: ParametresVoyage = { ...s, participants: profils.map((p) => p.id) };
          const lignes = (
            article.mode === 'suggestion'
              ? genererSuggestions(v, profils, catalogue, [])
              : genererArticles(v, profils, catalogue)
          ).filter((a) => a.origine !== 'perso');
          return (
            <li key={s.nom} className="flex flex-col gap-1 py-2">
              <span className="text-sm">{s.nom}</span>
              {lignes.length === 0 ? (
                <span className="text-sm text-discret">— n’apparaît pas</span>
              ) : (
                <span className="flex flex-wrap items-center gap-1.5">
                  {lignes.map((a) => (
                    <span
                      key={a.id}
                      className="rounded-full bg-accent-clair px-2 py-0.5 text-xs font-semibold text-accent"
                    >
                      {prenom(a.proprietaire)} ×{a.quantite}
                    </span>
                  ))}
                  {LISTES[lignes[0].liste] && <span className="text-xs text-discret">{LISTES[lignes[0].liste]}</span>}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
