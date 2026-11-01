'use client';

import {
  ArticleCatalogue,
  ArticleVoyage,
  Categorie,
  fusionner,
  genererArticles,
  Liste,
  ParametresVoyage,
  Profil,
  Statut,
  Voyage,
} from '@maillot/domain';
import { create } from 'zustand';
import { api, ErreurApi } from '@/lib/api';

// Les données vivent sur le serveur. Chaque action met d'abord l'écran à jour (le pointage reste instantané),
// puis l'enregistre via l'API. Les écritures partent dans l'ordre, une à la fois ; en cas d'échec, on recharge
// l'état du serveur et on affiche l'erreur.

export const nouvelId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

type EtatServeur = { profils: Profil[]; voyages: Voyage[] };
export type Role = 'admin' | 'editeur';
type Catalogue = { version: string; articles: ArticleCatalogue[] };
/** Invitation reçue à rejoindre la famille d'un autre compte. */
export type InvitationRecue = { id: string; invitePar: string; prenoms: string[] };
type Moi = { email: string; familleId: string; role?: Role; invitations: InvitationRecue[] };

interface Etat extends EtatServeur {
  statut: 'chargement' | 'deconnecte' | 'pret';
  email?: string;
  /** Famille du compte : change quand on rejoint ou quitte une famille partagée. */
  familleId?: string;
  /** Rôle dans l'équipe du catalogue (absent pour un compte ordinaire). */
  role?: Role;
  invitations: InvitationRecue[];
  /** Catalogue en service, fourni par le serveur : les listes sont générées avec. */
  catalogue: ArticleCatalogue[];
  erreur?: string;

  charger: () => Promise<void>;
  /** Relit les données du serveur (modifications faites par les autres membres de la famille). */
  rafraichir: () => Promise<void>;
  effacerErreur: () => void;
  importer: (donnees: EtatServeur) => Promise<void>;

  accepterInvitation: (id: string) => Promise<void>;
  refuserInvitation: (id: string) => Promise<void>;
  quitterFamille: () => Promise<void>;

  enregistrerProfil: (p: Profil) => void;
  supprimerProfil: (id: string) => void;

  creerVoyage: (params: ParametresVoyage) => string;
  modifierVoyage: (id: string, params: ParametresVoyage) => void;
  supprimerVoyage: (id: string) => void;

  changerStatut: (voyageId: string, articleId: string, statut: Statut) => void;
  changerQuantite: (voyageId: string, articleId: string, quantite: number) => void;
  ajouterArticle: (voyageId: string, nom: string, categorie: Categorie, proprietaire: string, liste?: Liste) => void;
  ajouterSuggestion: (voyageId: string, article: ArticleVoyage) => void;
  changerListe: (voyageId: string, articleId: string, liste: Liste) => void;
  supprimerArticle: (voyageId: string, articleId: string) => void;
}

const regenerer = (v: Voyage, profils: Profil[], catalogue: ArticleCatalogue[]): Voyage => ({
  ...v,
  articles: fusionner(v.articles, genererArticles(v, profils, catalogue), v.participants),
});

const enc = encodeURIComponent;

export const useStore = create<Etat>()((set, get) => {
  // File d'attente des écritures : une à la fois, dans l'ordre des clics.
  let file: Promise<unknown> = Promise.resolve();
  let enAttente = 0;
  /** Augmente à chaque modification locale : une relecture partie avant est alors ignorée. */
  let generation = 0;

  const charger = async () => {
    try {
      const [moi, etat, catalogue] = await Promise.all([
        api<Moi>('/moi'),
        api<EtatServeur>('/etat'),
        api<Catalogue>('/catalogue'),
      ]);
      set({
        ...etat,
        email: moi.email,
        familleId: moi.familleId,
        role: moi.role,
        invitations: moi.invitations,
        catalogue: catalogue.articles,
        statut: 'pret',
      });
    } catch (e) {
      if (e instanceof ErreurApi && e.statut === 401) set({ statut: 'deconnecte', profils: [], voyages: [] });
      else
        set({
          erreur: e instanceof Error ? e.message : 'Erreur',
          statut: get().statut === 'chargement' ? 'deconnecte' : get().statut,
        });
    }
  };

  /**
   * Envoie une écriture au serveur après les précédentes. `appliquer` reçoit la réponse : par défaut, il n'est
   * appelé que si plus aucune écriture n'attend (sinon l'écran, déjà à jour, reviendrait brièvement en arrière).
   */
  const envoyer = <T>(appel: () => Promise<T>, appliquer?: (reponse: T) => void, toujours = false) => {
    enAttente++;
    generation++;
    file = file
      .then(appel)
      .then((reponse) => {
        enAttente--;
        if (appliquer && (toujours || enAttente === 0)) appliquer(reponse);
      })
      .catch(async (e) => {
        enAttente--;
        if (e instanceof ErreurApi && e.statut === 401) {
          set({ statut: 'deconnecte' });
          return;
        }
        set({
          erreur: `Modification non enregistrée : ${e instanceof Error ? e.message : 'erreur'}. Données rechargées.`,
        });
        await charger();
      });
  };

  const majVoyage = (voyageId: string, f: (v: Voyage) => Voyage) =>
    set((s) => ({ voyages: s.voyages.map((v) => (v.id === voyageId ? f(v) : v)) }));
  const majArticles = (voyageId: string, f: (articles: ArticleVoyage[]) => ArticleVoyage[]) =>
    majVoyage(voyageId, (v) => ({ ...v, articles: f(v.articles) }));
  const majArticle = (voyageId: string, articleId: string, patch: Partial<ArticleVoyage>) =>
    majArticles(voyageId, (articles) => articles.map((a) => (a.id === articleId ? { ...a, ...patch } : a)));
  const remplacerVoyage = (v: Voyage) => majVoyage(v.id, () => v);
  const remplacerEtat = (etat: EtatServeur) => set(etat);

  /**
   * Relecture silencieuse. Ignorée si une écriture est en cours ou a eu lieu pendant la relecture : l'écran,
   * déjà à jour localement, ne doit pas revenir en arrière. Les erreurs (réseau coupé…) sont ignorées.
   */
  const rafraichir = async () => {
    if (get().statut !== 'pret' || enAttente > 0) return;
    const depart = generation;
    try {
      const [moi, etat] = await Promise.all([api<Moi>('/moi'), api<EtatServeur>('/etat')]);
      if (enAttente > 0 || generation !== depart) return;
      set({ ...etat, familleId: moi.familleId, role: moi.role, invitations: moi.invitations });
    } catch (e) {
      if (e instanceof ErreurApi && e.statut === 401) set({ statut: 'deconnecte' });
    }
  };

  /** Changement de famille (invitation acceptée, famille quittée) : la réponse est le nouvel état complet. */
  const changerDeFamille = async (appel: () => Promise<EtatServeur>) => {
    await file;
    generation++;
    const etat = await appel();
    set(etat);
    await rafraichir();
  };

  return {
    profils: [],
    voyages: [],
    invitations: [],
    statut: 'chargement',
    catalogue: [],

    charger,
    rafraichir,
    effacerErreur: () => set({ erreur: undefined }),

    importer: async (donnees) => {
      const etat = await api<EtatServeur>('/import', { methode: 'POST', corps: donnees });
      set(etat);
    },

    accepterInvitation: (id) =>
      changerDeFamille(() => api<EtatServeur>(`/invitations/${enc(id)}/accepter`, { methode: 'POST' })),
    refuserInvitation: async (id) => {
      await api(`/invitations/${enc(id)}/refuser`, { methode: 'POST' });
      set((s) => ({ invitations: s.invitations.filter((i) => i.id !== id) }));
    },
    quitterFamille: () => changerDeFamille(() => api<EtatServeur>('/famille/quitter', { methode: 'POST' })),

    // Un profil modifié met à jour les voyages auxquels il participe, sans perdre le pointage.
    enregistrerProfil: (p) => {
      set((s) => {
        const existe = s.profils.some((x) => x.id === p.id);
        const profils = existe ? s.profils.map((x) => (x.id === p.id ? p : x)) : [...s.profils, p];
        const voyages = s.voyages.map((v) => (v.participants.includes(p.id) ? regenerer(v, profils, s.catalogue) : v));
        return { profils, voyages };
      });
      envoyer(() => api<EtatServeur>(`/profils/${enc(p.id)}`, { methode: 'PUT', corps: p }), remplacerEtat);
    },

    supprimerProfil: (id) => {
      set((s) => {
        const profils = s.profils.filter((p) => p.id !== id);
        const voyages = s.voyages.map((v) =>
          v.participants.includes(id)
            ? regenerer({ ...v, participants: v.participants.filter((x) => x !== id) }, profils, s.catalogue)
            : v,
        );
        return { profils, voyages };
      });
      envoyer(() => api<EtatServeur>(`/profils/${enc(id)}`, { methode: 'DELETE' }), remplacerEtat);
    },

    creerVoyage: (params) => {
      const id = nouvelId();
      set((s) => ({
        voyages: [
          {
            ...params,
            id,
            creeLe: new Date().toISOString(),
            articles: genererArticles(params, s.profils, s.catalogue),
          },
          ...s.voyages,
        ],
      }));
      envoyer(() => api<Voyage>('/voyages', { methode: 'POST', corps: { ...params, id } }), remplacerVoyage);
      return id;
    },

    modifierVoyage: (id, params) => {
      set((s) => ({
        voyages: s.voyages.map((v) => (v.id === id ? regenerer({ ...v, ...params }, s.profils, s.catalogue) : v)),
      }));
      envoyer(() => api<Voyage>(`/voyages/${enc(id)}`, { methode: 'PUT', corps: params }), remplacerVoyage);
    },

    supprimerVoyage: (id) => {
      set((s) => ({ voyages: s.voyages.filter((v) => v.id !== id) }));
      envoyer(() => api(`/voyages/${enc(id)}`, { methode: 'DELETE' }));
    },

    // Pointage : l'écran est déjà à jour, la réponse du serveur n'est pas réappliquée.
    changerStatut: (voyageId, articleId, statut) => {
      majArticle(voyageId, articleId, { statut });
      envoyer(() =>
        api(`/voyages/${enc(voyageId)}/articles/${enc(articleId)}`, { methode: 'PATCH', corps: { statut } }),
      );
    },

    changerQuantite: (voyageId, articleId, quantite) => {
      const q = Math.max(1, quantite);
      majArticle(voyageId, articleId, { quantite: q, ajuste: true });
      envoyer(() =>
        api(`/voyages/${enc(voyageId)}/articles/${enc(articleId)}`, { methode: 'PATCH', corps: { quantite: q } }),
      );
    },

    changerListe: (voyageId, articleId, liste) => {
      majArticle(voyageId, articleId, { liste, listeChoisie: true });
      envoyer(() =>
        api(`/voyages/${enc(voyageId)}/articles/${enc(articleId)}`, { methode: 'PATCH', corps: { liste } }),
      );
    },

    // L'identifiant définitif est donné par le serveur : l'article provisoire est remplacé à la réponse.
    ajouterArticle: (voyageId, nom, categorie, proprietaire, liste = 'valise') => {
      const provisoire = `ajout-${nouvelId()}`;
      majArticles(voyageId, (articles) => [
        ...articles,
        { id: provisoire, nom, categorie, proprietaire, quantite: 1, statut: 'a-prendre', liste, origine: 'ajout' },
      ]);
      envoyer(
        () =>
          api<ArticleVoyage>(`/voyages/${enc(voyageId)}/articles`, {
            methode: 'POST',
            corps: { nom, categorie, proprietaire, liste },
          }),
        (cree) => majArticle(voyageId, provisoire, { id: cree.id }),
        true,
      );
    },

    ajouterSuggestion: (voyageId, article) => {
      majArticles(voyageId, (articles) =>
        articles.some((a) => a.id === article.id) ? articles : [...articles, { ...article, origine: 'suggestion' }],
      );
      envoyer(() => api(`/voyages/${enc(voyageId)}/suggestions/${enc(article.id)}`, { methode: 'POST' }));
    },

    supprimerArticle: (voyageId, articleId) => {
      majArticles(voyageId, (articles) => articles.filter((a) => a.id !== articleId));
      envoyer(() => api(`/voyages/${enc(voyageId)}/articles/${enc(articleId)}`, { methode: 'DELETE' }));
    },
  };
});
