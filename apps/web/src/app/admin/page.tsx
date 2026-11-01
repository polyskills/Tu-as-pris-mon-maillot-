'use client';

import { CATEGORIES, Categorie, decrireQuand, decrireQuantite } from '@maillot/domain';
import { ChevronRight, Plus, Users } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Historique } from '@/components/admin/Historique';
import { ReserveEquipe } from '@/components/admin/ReserveEquipe';
import { Contenu, EnTete } from '@/components/Coque';
import { ChoixUnique, classeSaisie } from '@/components/ui';
import { adminApi, ArticleAdmin } from '@/lib/admin';
import { useStore } from '@/store/store';

const VUES = { articles: 'Articles', historique: 'Dernières modifications' } as const;
const FILTRES = {
  tous: 'Tous',
  liste: 'Mis d’office',
  suggestion: '💡 Suggestions',
  voiture: '🚗 Voiture',
  achetable: '🛒 Achetables',
  archive: '🗄️ Archivés',
} as const;
type Filtre = keyof typeof FILTRES;

const garder = (a: ArticleAdmin, f: Filtre) => {
  if (f === 'archive') return a.archive;
  if (a.archive) return false;
  if (f === 'tous') return true;
  if (f === 'achetable') return !!a.achetable;
  return (a.mode ?? 'liste') === f;
};

const sansAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function Administration() {
  return (
    <ReserveEquipe>
      <Catalogue />
    </ReserveEquipe>
  );
}

function Catalogue() {
  const role = useStore((s) => s.role);
  const [articles, setArticles] = useState<ArticleAdmin[]>();
  const [erreur, setErreur] = useState<string>();
  const [vue, setVue] = useState<keyof typeof VUES>('articles');
  const [filtre, setFiltre] = useState<Filtre>('tous');
  const [categorie, setCategorie] = useState<Categorie | ''>('');
  const [recherche, setRecherche] = useState('');

  useEffect(() => {
    adminApi
      .lister()
      .then(setArticles)
      .catch((e: Error) => setErreur(e.message));
  }, []);

  const visibles = useMemo(() => {
    const r = sansAccents(recherche.trim());
    return (articles ?? []).filter(
      (a) =>
        garder(a, filtre) &&
        (!categorie || a.categorie === categorie) &&
        (!r || sansAccents(a.nom).includes(r) || a.id.includes(r)),
    );
  }, [articles, filtre, categorie, recherche]);

  const enService = articles?.filter((a) => !a.archive) ?? [];

  return (
    <>
      <EnTete
        titre="Catalogue"
        sousTitre={
          articles && `${enService.length} articles en service · ${articles.length - enService.length} archivés`
        }
        actions={
          <div className="flex gap-2">
            {role === 'admin' && (
              <Link
                href="/admin/equipe"
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-accent hover:bg-accent-clair"
              >
                <Users size={18} /> <span className="hidden sm:inline">Équipe</span>
              </Link>
            )}
            <Link
              href="/admin/article/nouveau"
              className="flex items-center gap-2 rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-accent-texte"
            >
              <Plus size={18} /> <span className="hidden sm:inline">Nouvel article</span>
            </Link>
          </div>
        }
      />
      <Contenu large>
        <div className="flex flex-col gap-4">
          <ChoixUnique options={VUES} valeur={vue} onChange={setVue} />
          {erreur && <p className="text-danger">{erreur}</p>}

          {vue === 'historique' ? (
            <Historique articles={articles ?? []} />
          ) : (
            <>
              <div className="flex flex-col gap-3 md:flex-row">
                <input
                  type="search"
                  placeholder="Rechercher un article…"
                  className={classeSaisie}
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                />
                <select
                  className={`${classeSaisie} md:w-64`}
                  value={categorie}
                  onChange={(e) => setCategorie(e.target.value as Categorie | '')}
                >
                  <option value="">Toutes les catégories</option>
                  {(Object.keys(CATEGORIES) as Categorie[]).map((c) => (
                    <option key={c} value={c}>
                      {CATEGORIES[c]}
                    </option>
                  ))}
                </select>
              </div>
              <ChoixUnique options={FILTRES} valeur={filtre} onChange={setFiltre} />

              {!articles ? (
                <p className="text-discret">Chargement…</p>
              ) : visibles.length === 0 ? (
                <p className="text-discret">Aucun article.</p>
              ) : (
                (Object.keys(CATEGORIES) as Categorie[]).map((c) => {
                  const liste = visibles.filter((a) => a.categorie === c);
                  if (!liste.length) return null;
                  return (
                    <section key={c} className="flex flex-col gap-2">
                      <h2 className="font-bold">
                        {CATEGORIES[c]} <span className="font-normal text-discret">({liste.length})</span>
                      </h2>
                      <ul className="divide-y divide-bordure overflow-hidden rounded-2xl border border-bordure bg-carte">
                        {liste.map((a) => (
                          <LigneArticle key={a.id} a={a} />
                        ))}
                      </ul>
                    </section>
                  );
                })
              )}
            </>
          )}
        </div>
      </Contenu>
    </>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-fond px-2 py-0.5 text-xs text-discret">{children}</span>;
}

function LigneArticle({ a }: { a: ArticleAdmin }) {
  return (
    <li>
      <Link
        href={`/admin/article/${a.id}`}
        className={`flex items-center gap-3 px-4 py-3 transition hover:bg-accent-clair/40 ${a.archive ? 'opacity-55' : ''}`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold">{a.nom}</span>
            {a.mode === 'suggestion' && <Badge>💡 suggestion</Badge>}
            {a.mode === 'voiture' && <Badge>🚗 voiture</Badge>}
            {a.achetable && <Badge>🛒 achetable</Badge>}
            <Badge>{a.portee === 'commun' ? 'commun' : 'par personne'}</Badge>
            {a.archive && <Badge>archivé</Badge>}
          </div>
          <p className="text-sm text-discret">{decrireQuand(a)}</p>
        </div>
        <span className="hidden shrink-0 text-sm text-discret md:block">Qté : {decrireQuantite(a.quantite)}</span>
        <ChevronRight size={18} className="shrink-0 text-discret" />
      </Link>
    </li>
  );
}
