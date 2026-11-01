'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ACTIONS, adminApi, ArticleAdmin, dateHeure, differences, EntreeHistorique } from '@/lib/admin';

/** Liste de modifications : globale, ou pour un article (`articleId`). */
export function Historique({
  articles,
  articleId,
  rafraichir,
}: {
  articles: ArticleAdmin[];
  articleId?: string;
  /** Change de valeur après une modification : l'historique est relu. */
  rafraichir?: unknown;
}) {
  const [entrees, setEntrees] = useState<EntreeHistorique[]>();
  const [erreur, setErreur] = useState<string>();

  useEffect(() => {
    adminApi
      .historique(articleId)
      .then(setEntrees)
      .catch((e: Error) => setErreur(e.message));
  }, [articleId, rafraichir]);

  if (erreur) return <p className="text-danger">{erreur}</p>;
  if (!entrees) return <p className="text-discret">Chargement…</p>;
  if (!entrees.length) return <p className="text-discret">Aucune modification pour l’instant.</p>;
  const nom = (id: string) => articles.find((a) => a.id === id)?.nom ?? id;

  return (
    <ul className="flex flex-col divide-y divide-bordure rounded-2xl border border-bordure bg-carte">
      {entrees.map((h) => {
        const details = differences(h.avant, h.apres);
        return (
          <li key={h.id} className="flex flex-col gap-1 px-4 py-3">
            <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
              <span className="font-semibold">{ACTIONS[h.action]}</span>
              {!articleId && (
                <Link href={`/admin/article/${h.articleId}`} className="font-semibold text-accent">
                  {nom(h.articleId)}
                </Link>
              )}
              <span className="text-discret">
                {dateHeure(h.date)} · {h.auteur}
              </span>
            </div>
            {details.map((d) => (
              <p key={d} className="text-sm text-discret">
                {d}
              </p>
            ))}
          </li>
        );
      })}
    </ul>
  );
}
