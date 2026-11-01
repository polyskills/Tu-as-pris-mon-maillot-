import { ArticleCatalogue, CATEGORIES, Condition, decrireQuand, decrireQuantite, decrireType } from '@maillot/domain';
import { Role } from '@/store/store';
import { api } from './api';

// Appels à l'administration du catalogue (/api/admin, réservé à l'équipe).

export type Brouillon = Omit<ArticleCatalogue, 'id'>;

export interface ArticleAdmin extends ArticleCatalogue {
  archive: boolean;
  majLe: string;
  majPar?: string;
  /** Renvoyé après une modification : nombre de voyages à venir régénérés. */
  voyagesMisAJour?: number;
}

export type Action = 'creation' | 'modification' | 'archivage' | 'restauration';

export interface EntreeHistorique {
  id: number;
  articleId: string;
  action: Action;
  avant?: (Brouillon & { archive: boolean }) | null;
  apres?: (Brouillon & { archive: boolean }) | null;
  auteur: string;
  date: string;
}

export interface Equipier {
  email: string;
  role: Role;
  /** Administrateur fixé par la configuration du serveur (ADMIN_EMAILS) : non modifiable ici. */
  fixe: boolean;
  ajoutePar?: string;
}

const enc = encodeURIComponent;

export const adminApi = {
  lister: () => api<ArticleAdmin[]>('/admin/catalogue'),
  creer: (a: Brouillon) => api<ArticleAdmin>('/admin/catalogue', { methode: 'POST', corps: a }),
  modifier: (id: string, a: Brouillon) =>
    api<ArticleAdmin>(`/admin/catalogue/${enc(id)}`, { methode: 'PUT', corps: a }),
  archiver: (id: string) => api<ArticleAdmin>(`/admin/catalogue/${enc(id)}/archiver`, { methode: 'POST' }),
  restaurer: (id: string) => api<ArticleAdmin>(`/admin/catalogue/${enc(id)}/restaurer`, { methode: 'POST' }),
  deplacer: (id: string, sens: 'haut' | 'bas') =>
    api<{ articles: ArticleAdmin[]; voyagesMisAJour: number }>(`/admin/catalogue/${enc(id)}/deplacer`, {
      methode: 'POST',
      corps: { sens },
    }),
  historique: (articleId?: string) =>
    api<EntreeHistorique[]>(`/admin/historique${articleId ? `?article=${enc(articleId)}` : ''}`),
  equipe: () => api<Equipier[]>('/admin/equipe'),
  enregistrerEquipier: (email: string, role: Role) =>
    api<Equipier[]>(`/admin/equipe/${enc(email)}`, { methode: 'PUT', corps: { role } }),
  retirerEquipier: (email: string) => api<Equipier[]>(`/admin/equipe/${enc(email)}`, { methode: 'DELETE' }),
};

export const ACTIONS: Record<Action, string> = {
  creation: 'Création',
  modification: 'Modification',
  archivage: 'Archivage',
  restauration: 'Restauration',
};

export const ROLES: Record<Role, string> = {
  admin: 'Admin (catalogue + équipe)',
  editeur: 'Éditeur (catalogue)',
};

const memeValeur = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Ce qui a changé entre deux états d'un article, en français. */
export function differences(avant?: Brouillon | null, apres?: Brouillon | null): string[] {
  if (!avant || !apres) return [];
  const d: string[] = [];
  if (avant.nom !== apres.nom) d.push(`nom : « ${avant.nom} » → « ${apres.nom} »`);
  if (avant.categorie !== apres.categorie)
    d.push(`catégorie : ${CATEGORIES[avant.categorie]} → ${CATEGORIES[apres.categorie]}`);
  if (avant.portee !== apres.portee) d.push(`pour : ${PORTEES[avant.portee]} → ${PORTEES[apres.portee]}`);
  if (!memeValeur(avant.mode, apres.mode) || !!avant.achetable !== !!apres.achetable)
    d.push(`type : ${decrireType(avant)} → ${decrireType(apres)}`);
  if (!memeValeur(avant.si, apres.si)) d.push(`quand : ${decrireQuand(avant)} → ${decrireQuand(apres)}`);
  if (!memeValeur(avant.quantite, apres.quantite))
    d.push(`quantité : ${decrireQuantite(avant.quantite)} → ${decrireQuantite(apres.quantite)}`);
  return d;
}

export const PORTEES = { personne: 'Chaque personne concernée', commun: 'Commun (un pour le groupe)' } as const;

/** Retire les critères vides : un critère sans valeur ne filtre rien. */
export function nettoyerCondition(c: Condition): Condition | undefined {
  const propre: Record<string, unknown> = {};
  for (const [cle, valeur] of Object.entries(c)) {
    if (cle === 'sauf') continue;
    if (Array.isArray(valeur) ? valeur.length > 0 : valeur !== undefined && valeur !== null) propre[cle] = valeur;
  }
  const sauf = (Array.isArray(c.sauf) ? c.sauf : c.sauf ? [c.sauf] : [])
    .map(nettoyerCondition)
    .filter((x): x is Condition => !!x);
  if (sauf.length) propre.sauf = sauf.length === 1 ? sauf[0] : sauf;
  return Object.keys(propre).length ? (propre as Condition) : undefined;
}

/** Brouillon prêt à envoyer : conditions nettoyées, champs vides retirés. */
export function preparer(b: Brouillon): Brouillon {
  const cas = (Array.isArray(b.si) ? b.si : b.si ? [b.si] : [])
    .map(nettoyerCondition)
    .filter((x): x is Condition => !!x);
  return {
    nom: b.nom.trim(),
    categorie: b.categorie,
    portee: b.portee,
    ...(b.mode && { mode: b.mode }),
    ...(b.achetable && { achetable: true }),
    ...(cas.length && { si: cas.length === 1 ? cas[0] : cas }),
    ...(b.quantite && { quantite: b.quantite }),
  };
}

export const dateHeure = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

/** « 3 voyages à venir mis à jour » */
export const voyagesMisAJour = (n = 0) =>
  n === 0 ? 'Aucun voyage à venir à mettre à jour.' : `${n} voyage${n > 1 ? 's' : ''} à venir mis à jour.`;
