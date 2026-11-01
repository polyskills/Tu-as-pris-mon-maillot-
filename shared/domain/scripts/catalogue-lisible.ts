// Génère docs/catalogue.md : le catalogue de départ (shared/domain/src/catalogue.ts) avec ses règles en français.
// Le catalogue en service vit en base et se consulte dans l'administration. Lancer avec : pnpm catalogue

import { writeFileSync } from 'node:fs';
import { CATALOGUE } from '../src/catalogue';
import { decrireQuand, decrireQuantite, decrireType } from '../src/description';
import { CATEGORIES } from '../src/libelles';
import { ArticleCatalogue, Categorie } from '../src/types';

const quand = (a: ArticleCatalogue) => decrireQuand(a, ' **OU** ');

const echapper = (s: string) => s.replace(/\|/g, '\\|');

const lignes: string[] = [
  '# Catalogue des articles',
  '',
  '> Fichier généré automatiquement depuis `shared/domain/src/catalogue.ts` par `pnpm catalogue`. Catalogue de départ : celui en service se consulte dans l’administration.',
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
      `| ${echapper(a.nom)} | ${a.portee === 'commun' ? 'Commun' : 'Chaque personne'} | ${echapper(quand(a))} | ${decrireQuantite(a.quantite)} | ${decrireType(a)} |`,
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
