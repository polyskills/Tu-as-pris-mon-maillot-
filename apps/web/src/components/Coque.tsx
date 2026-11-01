'use client';

import { ChevronLeft, Luggage, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode } from 'react';
import { useHydrate } from '@/store/store';

const NAVIGATION = [
  { href: '/', libelle: 'Mes voyages', Icone: Luggage, actif: (p: string) => p === '/' || p.startsWith('/voyage') },
  { href: '/famille', libelle: 'Ma famille', Icone: Users, actif: (p: string) => p.startsWith('/famille') },
];

/**
 * Mise en page commune : menu latéral sur ordinateur et tablette,
 * barre d'onglets en bas sur smartphone.
 */
export function Coque({ children }: { children: ReactNode }) {
  const chemin = usePathname();
  const pret = useHydrate();

  return (
    <div className="min-h-dvh md:flex">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-1 border-r border-bordure bg-carte p-4 md:flex">
        <Link href="/" className="mb-6 px-2">
          <span className="block text-sm font-semibold text-discret">Tu as pris</span>
          <span className="block text-xl font-extrabold">mon maillot ? 🩱</span>
        </Link>
        {NAVIGATION.map(({ href, libelle, Icone, actif }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium transition ${
              actif(chemin) ? 'bg-accent-clair text-accent' : 'text-texte hover:bg-bordure/50'
            }`}
          >
            <Icone size={20} />
            {libelle}
          </Link>
        ))}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">{pret ? children : null}</div>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-bordure bg-carte pb-[env(safe-area-inset-bottom)] md:hidden">
        {NAVIGATION.map(({ href, libelle, Icone, actif }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium ${
              actif(chemin) ? 'text-accent' : 'text-discret'
            }`}
          >
            <Icone size={22} />
            {libelle}
          </Link>
        ))}
      </nav>
    </div>
  );
}

/** En-tête de page : titre, retour éventuel et actions à droite. */
export function EnTete({
  titre,
  retour,
  actions,
  sousTitre,
}: {
  titre: string;
  retour?: string;
  actions?: ReactNode;
  sousTitre?: ReactNode;
}) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-30 border-b border-bordure bg-carte/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 md:px-8">
        {retour && (
          <button
            type="button"
            aria-label="Retour"
            onClick={() => (window.history.length > 1 ? router.back() : router.push(retour))}
            className="-ml-2 rounded-full p-1.5 text-accent hover:bg-accent-clair"
          >
            <ChevronLeft size={24} />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold md:text-xl">{titre}</h1>
          {sousTitre && <div className="text-sm text-discret">{sousTitre}</div>}
        </div>
        {actions}
      </div>
    </header>
  );
}

export function Contenu({ children, large }: { children: ReactNode; large?: boolean }) {
  return (
    <main className={`mx-auto w-full px-4 py-5 md:px-8 md:py-8 ${large ? 'max-w-6xl' : 'max-w-2xl'}`}>{children}</main>
  );
}
