import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { CATALOGUE } from '../domain/catalogue';
import { fusionner, genererArticles } from '../domain/generer';
import { ArticleVoyage, Categorie, ParametresVoyage, Profil, Statut, Voyage } from '../domain/types';
import { stockage } from './stockage';

export const nouvelId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

interface Etat {
  profils: Profil[];
  voyages: Voyage[];

  enregistrerProfil: (p: Profil) => void;
  supprimerProfil: (id: string) => void;

  creerVoyage: (params: ParametresVoyage) => string;
  modifierVoyage: (id: string, params: ParametresVoyage) => void;
  supprimerVoyage: (id: string) => void;

  changerStatut: (voyageId: string, articleId: string, statut: Statut) => void;
  changerQuantite: (voyageId: string, articleId: string, quantite: number) => void;
  ajouterArticle: (voyageId: string, nom: string, categorie: Categorie, proprietaire: string) => void;
  supprimerArticle: (voyageId: string, articleId: string) => void;
}

const regenerer = (v: Voyage, profils: Profil[]): Voyage => ({
  ...v,
  articles: fusionner(v.articles, genererArticles(v, profils, CATALOGUE), v.participants),
});

export const useStore = create<Etat>()(
  persist(
    (set) => {
      const majArticles = (voyageId: string, f: (articles: ArticleVoyage[]) => ArticleVoyage[]) =>
        set((s) => ({
          voyages: s.voyages.map((v) => (v.id === voyageId ? { ...v, articles: f(v.articles) } : v)),
        }));
      const majArticle = (voyageId: string, articleId: string, patch: Partial<ArticleVoyage>) =>
        majArticles(voyageId, (articles) => articles.map((a) => (a.id === articleId ? { ...a, ...patch } : a)));

      return {
        profils: [],
        voyages: [],

        // Un profil modifié met à jour les voyages auxquels il participe, sans perdre le pointage.
        enregistrerProfil: (p) =>
          set((s) => {
            const existe = s.profils.some((x) => x.id === p.id);
            const profils = existe ? s.profils.map((x) => (x.id === p.id ? p : x)) : [...s.profils, p];
            const voyages = s.voyages.map((v) => (v.participants.includes(p.id) ? regenerer(v, profils) : v));
            return { profils, voyages };
          }),

        supprimerProfil: (id) =>
          set((s) => {
            const profils = s.profils.filter((p) => p.id !== id);
            const voyages = s.voyages.map((v) =>
              v.participants.includes(id)
                ? regenerer({ ...v, participants: v.participants.filter((x) => x !== id) }, profils)
                : v,
            );
            return { profils, voyages };
          }),

        creerVoyage: (params) => {
          const id = nouvelId();
          set((s) => ({
            voyages: [
              { ...params, id, creeLe: new Date().toISOString(), articles: genererArticles(params, s.profils, CATALOGUE) },
              ...s.voyages,
            ],
          }));
          return id;
        },

        modifierVoyage: (id, params) =>
          set((s) => ({
            voyages: s.voyages.map((v) => (v.id === id ? regenerer({ ...v, ...params }, s.profils) : v)),
          })),

        supprimerVoyage: (id) => set((s) => ({ voyages: s.voyages.filter((v) => v.id !== id) })),

        changerStatut: (voyageId, articleId, statut) => majArticle(voyageId, articleId, { statut }),

        changerQuantite: (voyageId, articleId, quantite) =>
          majArticle(voyageId, articleId, { quantite: Math.max(1, quantite), ajuste: true }),

        ajouterArticle: (voyageId, nom, categorie, proprietaire) =>
          majArticles(voyageId, (articles) => [
            ...articles,
            { id: `ajout-${nouvelId()}`, nom, categorie, proprietaire, quantite: 1, statut: 'a-prendre', origine: 'ajout' },
          ]),

        supprimerArticle: (voyageId, articleId) =>
          majArticles(voyageId, (articles) => articles.filter((a) => a.id !== articleId)),
      };
    },
    {
      name: 'maillot',
      version: 1,
      storage: createJSONStorage(() => stockage),
    },
  ),
);
