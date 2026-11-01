// Génère docs/catalogue.md : tout le catalogue avec ses règles, traduites en français.
// Lancer avec : npm run catalogue

import { writeFileSync } from 'node:fs';
import { CATALOGUE } from '../src/catalogue';
import {
  ACTIVITES,
  CATEGORIES,
  CLIMATS,
  DESTINATIONS,
  HABITUDES,
  HEBERGEMENTS,
  SEXES,
  TRANCHES,
  TRANSPORTS,
  ZONES,
} from '../src/libelles';
import { ArticleCatalogue, Categorie, Condition, RegleQuantite } from '../src/types';

/** Retire l'emoji en tête d'un libellé (« 🏖️ Plage » → « Plage »). */
const sansEmoji = (s: string) => s.replace(/^[^\p{L}]+\s/u, '');
const ou = <K extends string>(cles: K[], libelles: Record<K, string>) =>
  cles.map((k) => sansEmoji(libelles[k])).join(' ou ');

function decrire(c: Condition): string {
  const morceaux: string[] = [];
  if (c.destinations) morceaux.push(`destination ${ou(c.destinations, DESTINATIONS)}`);
  if (c.climats) morceaux.push(`climat ${ou(c.climats, CLIMATS).toLowerCase()}`);
  if (c.zones) morceaux.push(ou(c.zones, ZONES));
  if (c.transports) morceaux.push(`en ${ou(c.transports, TRANSPORTS).toLowerCase()}`);
  if (c.hebergements) morceaux.push(`hébergement ${ou(c.hebergements, HEBERGEMENTS).toLowerCase()}`);
  if (c.activites) morceaux.push(`activité ${ou(c.activites, ACTIVITES).toLowerCase()}`);
  if (c.ages) morceaux.push(ou(c.ages, TRANCHES).toLowerCase());
  if (c.sexes) morceaux.push(ou(c.sexes, SEXES).toLowerCase());
  if (c.habitudes) morceaux.push(`habitude « ${ou(c.habitudes, HABITUDES)} »`);
  if (c.machineALaver !== undefined) morceaux.push(c.machineALaver ? 'machine à laver' : 'sans machine à laver');
  if (c.nuitsMin !== undefined) morceaux.push(`${c.nuitsMin} nuits ou plus`);
  let texte = morceaux.join(' + ') || 'toujours';
  if (c.sauf) {
    const sauf = (Array.isArray(c.sauf) ? c.sauf : [c.sauf]).map(decrire).join(' ou ');
    texte += `, sauf ${sauf}`;
  }
  return texte;
}

function quand(a: ArticleCatalogue): string {
  const base = !a.si ? 'Toujours' : Array.isArray(a.si) ? a.si.map(decrire).join(' **OU** ') : decrire(a.si);
  const texte = base.charAt(0).toUpperCase() + base.slice(1);
  return a.mode === 'voiture' ? `${texte} (trajet en voiture)` : texte;
}

const nb = (n: number) => String(n).replace('.', ',');

function quantite(q?: RegleQuantite): string {
  if (!q) return '1';
  switch (q.type) {
    case 'fixe':
      return String(q.n);
    case 'parClimat':
      return `chaud ${q.chaud} · tempéré ${q.tempere} · froid ${q.froid}`;
    case 'parParticipant':
      return '1 par participant';
    case 'parJour': {
      let t = `${nb(q.ratio)} par jour`;
      if (q.auChaud !== undefined) t += ` (${nb(q.auChaud)} au chaud)`;
      if (q.plus) t += ` + ${q.plus}`;
      if (q.max) t += `, ${q.max} max`;
      return t;
    }
  }
}

const TYPES = { liste: 'Mis d’office', suggestion: '💡 Suggestion', voiture: '🚗 Check-list voiture' };
const type = (a: ArticleCatalogue) => {
  const t = TYPES[a.mode ?? 'liste'];
  return a.achetable ? `${t} · 🛒 achetable sur place` : t;
};
const echapper = (s: string) => s.replace(/\|/g, '\\|');

const lignes: string[] = [
  '# Catalogue des articles',
  '',
  '> Fichier généré automatiquement depuis `shared/domain/src/catalogue.ts` par `npm run catalogue`. Ne pas le modifier à la main.',
  '',
  `**${CATALOGUE.length} articles** : ${CATALOGUE.filter((a) => !a.mode).length} mis d’office, ${
    CATALOGUE.filter((a) => a.mode === 'suggestion').length
  } suggestions, ${CATALOGUE.filter((a) => a.mode === 'voiture').length} points de check-list voiture, dont ${
    CATALOGUE.filter((a) => a.achetable).length
  } achetables sur place.`,
  '',
  '## Comment lire les règles',
  '',
  '- **Pour** : « Chaque personne » = une ligne par voyageur concerné ; « Commun » = une seule ligne pour le groupe, si au moins un voyageur est concerné.',
  '- **Quand** : les critères reliés par « + » doivent tous être vrais. « **OU** » sépare plusieurs cas possibles. « sauf » exclut un cas.',
  '- **Âges** : bébé 0-2 ans, enfant 3-11, ado 12-17, adulte 18-64, senior 65+ (calculés à la date du départ).',
  '- **Quantité « par jour »** : sur la base de nuits + 1 jours, plafonnée à 7 jours avec une machine à laver.',
  '- **🛒 Achetable sur place** : va dans la liste de courses si le trajet se fait en avion ou en train.',
  '',
];

for (const cat of Object.keys(CATEGORIES) as Categorie[]) {
  const articles = CATALOGUE.filter((a) => a.categorie === cat && a.mode !== 'voiture');
  if (articles.length === 0) continue;
  lignes.push(
    `## ${CATEGORIES[cat]} (${articles.length})`,
    '',
    '| Article | Pour | Quand | Quantité | Type |',
    '|---|---|---|---|---|',
  );
  for (const a of articles) {
    lignes.push(
      `| ${echapper(a.nom)} | ${a.portee === 'commun' ? 'Commun' : 'Chaque personne'} | ${echapper(quand(a))} | ${quantite(a.quantite)} | ${type(a)} |`,
    );
  }
  lignes.push('');
}

const voiture = CATALOGUE.filter((a) => a.mode === 'voiture');
lignes.push(`## 🚗 Check-list voiture (${voiture.length})`, '', '| Point à vérifier | Quand |', '|---|---|');
for (const a of voiture) lignes.push(`| ${echapper(a.nom)} | ${echapper(quand(a))} |`);
lignes.push('');

writeFileSync(new URL('../../../docs/catalogue.md', import.meta.url), lignes.join('\n'));
console.log(`docs/catalogue.md : ${CATALOGUE.length} articles`);
