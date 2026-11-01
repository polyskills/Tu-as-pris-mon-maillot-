// Traduction des règles du catalogue en français : sert à l'administration (aperçu) et à docs/catalogue.md.

import {
  ACTIVITES,
  CLIMATS,
  DESTINATIONS,
  HABITUDES,
  HEBERGEMENTS,
  SEXES,
  TRANCHES,
  TRANSPORTS,
  ZONES,
} from './libelles';
import { ArticleCatalogue, Condition, RegleQuantite } from './types';

/** Retire l'emoji en tête d'un libellé (« 🏖️ Plage » → « Plage »). */
export const sansEmoji = (s: string) => s.replace(/^[^\p{L}]+\s/u, '');
const ou = <K extends string>(cles: K[], libelles: Record<K, string>) =>
  cles.map((k) => sansEmoji(libelles[k] ?? k)).join(' ou ');

/** « destination Plage + climat chaud, sauf hébergement hôtel » */
export function decrireCondition(c: Condition): string {
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
    const sauf = (Array.isArray(c.sauf) ? c.sauf : [c.sauf]).map(decrireCondition).join(' ou ');
    texte += `, sauf ${sauf}`;
  }
  return texte;
}

/** Quand l'article apparaît. `separateur` relie les cas possibles (OU). */
export function decrireQuand(a: Pick<ArticleCatalogue, 'si' | 'mode'>, separateur = ' OU '): string {
  const base = !a.si
    ? 'Toujours'
    : Array.isArray(a.si)
      ? a.si.map(decrireCondition).join(separateur)
      : decrireCondition(a.si);
  const texte = base.charAt(0).toUpperCase() + base.slice(1);
  return a.mode === 'voiture' ? `${texte} (trajet en voiture)` : texte;
}

const nb = (n: number) => String(n).replace('.', ',');

export function decrireQuantite(q?: RegleQuantite): string {
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

export const TYPES_ARTICLE = {
  liste: 'Mis d’office',
  suggestion: '💡 Suggestion',
  voiture: '🚗 Check-list voiture',
} as const;

export function decrireType(a: Pick<ArticleCatalogue, 'mode' | 'achetable'>): string {
  const t = TYPES_ARTICLE[a.mode ?? 'liste'];
  return a.achetable ? `${t} · 🛒 achetable sur place` : t;
}
