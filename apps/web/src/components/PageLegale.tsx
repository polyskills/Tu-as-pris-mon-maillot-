import Link from 'next/link';
import { ReactNode } from 'react';

/** Mise en page des pages légales : lisibles sans être connecté. */
export function PageLegale({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 md:px-8 md:py-10">
      <Link href="/" className="text-sm font-semibold text-accent">
        ← Tu as pris mon maillot ?
      </Link>
      <h1 className="mt-4 mb-6 text-2xl font-extrabold md:text-3xl">{titre}</h1>
      <div className="flex flex-col gap-6 leading-relaxed [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_p+p]:mt-2 [&_ul]:mt-2 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1">
        {children}
      </div>
      <p className="mt-10 border-t border-bordure pt-4 text-sm text-discret">
        <Link href="/mentions-legales" className="hover:text-accent">
          Mentions légales
        </Link>
        {' · '}
        <Link href="/confidentialite" className="hover:text-accent">
          Confidentialité
        </Link>
      </p>
    </main>
  );
}

/** Valeur connue, ou repère jaune bien visible tant qu'elle n'est pas renseignée (lib/legal.ts). */
export function Valeur({ v, manque }: { v: string | null; manque: string }) {
  if (v) return <>{v}</>;
  return <mark className="rounded bg-soleil px-1 text-[#1b1f2a]">[à compléter : {manque}]</mark>;
}

/** Liens discrets vers les pages légales (bas de l'écran de connexion, menu). */
export function LiensLegaux({ className = '' }: { className?: string }) {
  return (
    <p className={`text-xs text-discret ${className}`}>
      <Link href="/mentions-legales" className="hover:text-accent">
        Mentions légales
      </Link>
      {' · '}
      <Link href="/confidentialite" className="hover:text-accent">
        Confidentialité
      </Link>
    </p>
  );
}
