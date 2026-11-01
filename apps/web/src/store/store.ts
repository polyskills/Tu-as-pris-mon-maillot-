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
import {
  ajouterALaFile,
  appliquerFile,
  effacerDonneesLocales,
  lireDonnees,
  lireFile,
  PatchArticle,
  PointageEnAttente,
  renommerDansFile,
  sauverDonnees,
  sauverFile,
} from '@/lib/horsLigne';

// Les données vivent sur le serveur. Chaque action met d'abord l'écran à jour (le pointage reste instantané),
// puis l'enregistre via l'API. Les écritures partent dans l'ordre, une à la fois ; en cas d'échec, on recharge
// l'état du serveur et on affiche l'erreur.
//
// Hors ligne : une copie des données est gardée sur l'appareil (l'application s'ouvre sans réseau) et le pointage
// (case cochée, quantité, liste) passe par une file gardée sur l'appareil, envoyée au retour du réseau. Les autres
// modifications (profils, voyages, ajouts) demandent le réseau.

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
  /** Augmente à chaque relecture des données du serveur (les écrans annexes, comme le partage, se rechargent). */
  revision: number;
  /** Catalogue en service, fourni par le serveur : les listes sont générées avec. */
  catalogue: ArticleCatalogue[];
  erreur?: string;
  /** Le serveur ne répond pas : l'écran montre la copie gardée sur l'appareil. */
  horsLigne: boolean;
  /** Pointages faits sur cet appareil et pas encore enregistrés par le serveur. */
  pointagesEnAttente: number;

  charger: () => Promise<void>;
  /** Relit les données du serveur (modifications faites par les autres membres de la famille). */
  rafraichir: () => Promise<void>;
  /** Envoie les pointages en attente (au retour du réseau). */
  envoyerPointages: () => Promise<void>;
  /** Déconnexion : efface aussi la copie gardée sur l'appareil. */
  oublier: () => void;
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
  /** Pointages pas encore enregistrés par le serveur (copie gardée sur l'appareil). */
  let filePointage: PointageEnAttente[] = lireFile();
  let envoiEnCours = false;

  const majFile = (f: PointageEnAttente[]) => {
    filePointage = f;
    sauverFile(f);
    set({ pointagesEnAttente: f.length });
  };
  /** Les voyages du serveur, avec les pointages de cet appareil pas encore envoyés. */
  const avecFile = (voyages: Voyage[]) => appliquerFile(voyages, filePointage, get().email);
  const estReseau = (e: unknown) => e instanceof ErreurApi && e.statut === 0;

  const deconnecte = () => {
    effacerDonneesLocales();
    filePointage = [];
    set({ statut: 'deconnecte', profils: [], voyages: [], invitations: [], pointagesEnAttente: 0 });
  };

  const charger = async () => {
    try {
      const [moi, etat, catalogue] = await Promise.all([
        api<Moi>('/moi'),
        api<EtatServeur>('/etat'),
        api<Catalogue>('/catalogue'),
      ]);
      set({
        profils: etat.profils,
        voyages: avecFile(etat.voyages),
        email: moi.email,
        familleId: moi.familleId,
        role: moi.role,
        invitations: moi.invitations,
        catalogue: catalogue.articles,
        statut: 'pret',
        horsLigne: false,
      });
      if (filePointage.length) void envoyerPointages();
    } catch (e) {
      const locales = estReseau(e) ? lireDonnees() : undefined;
      if (locales) {
        set({ ...locales, voyages: avecFile(locales.voyages), statut: 'pret', horsLigne: true });
      } else if (e instanceof ErreurApi && e.statut === 401) {
        deconnecte();
      } else {
        set({
          erreur: e instanceof Error ? e.message : 'Erreur',
          statut: get().statut === 'chargement' ? 'deconnecte' : get().statut,
        });
      }
    }
  };

  /**
   * Envoie la file des pointages, dans l'ordre, après les autres écritures. Réseau coupé : on s'arrête et on
   * réessaiera (retour du réseau, relecture). Article ou voyage disparu entre-temps : le pointage est abandonné.
   */
  const envoyerPointages = async () => {
    if (envoiEnCours) return;
    envoiEnCours = true;
    try {
      await file;
      while (filePointage.length) {
        const e = filePointage[0];
        try {
          await api(`/voyages/${enc(e.voyageId)}/articles/${enc(e.articleId)}`, { methode: 'PATCH', corps: e.patch });
          set({ horsLigne: false });
        } catch (err) {
          if (estReseau(err)) {
            set({ horsLigne: true });
            return;
          }
          if (err instanceof ErreurApi && err.statut === 401) {
            set({ statut: 'deconnecte' });
            return;
          }
          if (!(err instanceof ErreurApi && err.statut === 404)) {
            set({ erreur: `Pointage non enregistré : ${err instanceof Error ? err.message : 'erreur'}` });
          }
        }
        // Retirée seulement si elle n'a pas changé pendant l'envoi (sinon la nouvelle valeur part au tour suivant).
        if (filePointage[0] === e) majFile(filePointage.slice(1));
      }
    } finally {
      envoiEnCours = false;
    }
  };

  const pointer = (voyageId: string, articleId: string, patch: PatchArticle) => {
    generation++;
    majFile(ajouterALaFile(filePointage, { voyageId, articleId, patch }));
    void envoyerPointages();
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
          erreur: estReseau(e)
            ? 'Pas de connexion : hors ligne, seul le pointage est possible. Modification annulée.'
            : `Modification non enregistrée : ${e instanceof Error ? e.message : 'erreur'}. Données rechargées.`,
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
  const remplacerVoyage = (v: Voyage) => majVoyage(v.id, () => avecFile([v])[0]);
  const remplacerEtat = (etat: EtatServeur) => set({ profils: etat.profils, voyages: avecFile(etat.voyages) });

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
      set((s) => ({
        profils: etat.profils,
        voyages: avecFile(etat.voyages),
        familleId: moi.familleId,
        role: moi.role,
        invitations: moi.invitations,
        revision: s.revision + 1,
        horsLigne: false,
      }));
      if (filePointage.length) void envoyerPointages();
    } catch (e) {
      if (e instanceof ErreurApi && e.statut === 401) deconnecte();
      else if (estReseau(e)) set({ horsLigne: true });
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
    revision: 0,
    statut: 'chargement',
    catalogue: [],
    horsLigne: false,
    pointagesEnAttente: filePointage.length,

    charger,
    rafraichir,
    envoyerPointages,
    oublier: deconnecte,
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
    // Pointage (fonctionne hors ligne) : l'écran est déjà à jour, la réponse du serveur n'est pas réappliquée.
    changerStatut: (voyageId, articleId, statut) => {
      majArticle(voyageId, articleId, { statut, pointePar: get().email });
      pointer(voyageId, articleId, { statut });
    },

    changerQuantite: (voyageId, articleId, quantite) => {
      const q = Math.max(1, quantite);
      majArticle(voyageId, articleId, { quantite: q, ajuste: true });
      pointer(voyageId, articleId, { quantite: q });
    },

    changerListe: (voyageId, articleId, liste) => {
      majArticle(voyageId, articleId, { liste, listeChoisie: true });
      pointer(voyageId, articleId, { liste });
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
        (cree) => {
          majArticle(voyageId, provisoire, { id: cree.id });
          majFile(renommerDansFile(filePointage, voyageId, provisoire, cree.id));
        },
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

// Copie des données sur l'appareil (pour s'ouvrir hors ligne), regroupée : au plus une écriture par seconde.
if (typeof window !== 'undefined') {
  let attente: ReturnType<typeof setTimeout> | undefined;
  useStore.subscribe((s, avant) => {
    if (s.statut !== 'pret' || !s.email) return;
    if (s.profils === avant.profils && s.voyages === avant.voyages && s.catalogue === avant.catalogue) return;
    clearTimeout(attente);
    attente = setTimeout(() => {
      const { email, familleId, profils, voyages, catalogue, statut } = useStore.getState();
      if (statut === 'pret' && email) sauverDonnees({ email, familleId, profils, voyages, catalogue });
    }, 1000);
  });
}
