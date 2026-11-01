'use client';

import { ChevronLeft, LogOut, Luggage, Users, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { Bouton } from '@/components/ui';
import { deconnecter } from '@/lib/api';
import { useStore } from '@/store/store';

const NAVIGATION = [
  { href: '/', libelle: 'Mes voyages', Icone: Luggage, actif: (p: string) => p === '/' || p.startsWith('/voyage') },
  { href: '/famille', libelle: 'Ma famille', Icone: Users, actif: (p: string) => p.startsWith('/famille') },
];

/**
 * Mise en page commune : menu latéral sur ordinateur et tablette, barre d'onglets en bas sur smartphone.
 * Charge les données du compte ; sans session, renvoie vers l'écran de connexion.
 */
export function Coque({ children }: { children: ReactNode }) {
  const chemin = usePathname();
  const router = useRouter();
  const statut = useStore((s) => s.statut);
  const email = useStore((s) => s.email);
  const charger = useStore((s) => s.charger);
  const surConnexion = chemin === '/connexion';

  useEffect(() => {
    void charger();
  }, [charger]);

  useEffect(() => {
    if (statut === 'deconnecte' && !surConnexion) router.replace('/connexion');
    if (statut === 'pret' && surConnexion) router.replace('/');
  }, [statut, surConnexion, router]);

  if (surConnexion) return statut === 'pret' ? null : <>{children}</>;
  if (statut !== 'pret') {
    return <p className="p-10 text-center text-discret">{statut === 'chargement' ? 'Chargement…' : ''}</p>;
  }

  const seDeconnecter = async () => {
    await deconnecter().catch(() => undefined);
    useStore.setState({ statut: 'deconnecte', profils: [], voyages: [], email: undefined });
  };

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
        <div className="mt-auto flex flex-col gap-1 border-t border-bordure pt-3">
          <span className="truncate px-3 text-sm text-discret" title={email}>
            {email}
          </span>
          <button
            type="button"
            onClick={() => void seDeconnecter()}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-discret hover:bg-bordure/50"
          >
            <LogOut size={18} /> Se déconnecter
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">
        <RepriseNavigateur />
        {children}
        <div className="mx-auto w-full max-w-6xl px-4 pb-6 md:hidden">
          <button
            type="button"
            onClick={() => void seDeconnecter()}
            className="flex items-center gap-2 text-sm text-discret"
          >
            <LogOut size={16} /> Se déconnecter ({email})
          </button>
        </div>
      </div>

      <MessageErreur />

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

function MessageErreur() {
  const erreur = useStore((s) => s.erreur);
  const effacer = useStore((s) => s.effacerErreur);
  if (!erreur) return null;
  return (
    <div
      role="alert"
      className="fixed inset-x-4 top-4 z-50 mx-auto flex max-w-md items-start gap-3 rounded-xl border border-danger bg-carte p-4 shadow-lg"
    >
      <p className="flex-1 text-sm">{erreur}</p>
      <button type="button" aria-label="Fermer" onClick={effacer} className="text-discret">
        <X size={18} />
      </button>
    </div>
  );
}

/** Données saisies dans ce navigateur avant la création des comptes (ancienne version). */
const CLE_LOCALE = 'maillot';
const CLE_IGNOREE = 'maillot-reprise-ignoree';

function lireDonneesLocales() {
  try {
    if (localStorage.getItem(CLE_IGNOREE)) return null;
    const brut = JSON.parse(localStorage.getItem(CLE_LOCALE) ?? 'null');
    const etat = brut?.state;
    if (!etat || (!etat.profils?.length && !etat.voyages?.length)) return null;
    return { profils: etat.profils ?? [], voyages: etat.voyages ?? [] };
  } catch {
    return null;
  }
}

/** Propose, une fois, de transférer vers le compte les données saisies dans ce navigateur. */
function RepriseNavigateur() {
  const vide = useStore((s) => s.profils.length === 0 && s.voyages.length === 0);
  const importer = useStore((s) => s.importer);
  const [locales] = useState(lireDonneesLocales);
  const [etat, setEtat] = useState<'question' | 'envoi' | 'fini' | 'erreur'>('question');

  if (!locales || !vide || etat === 'fini') return null;

  const recuperer = async () => {
    setEtat('envoi');
    try {
      await importer(locales);
      localStorage.removeItem(CLE_LOCALE);
      setEtat('fini');
    } catch {
      setEtat('erreur');
    }
  };
  const ignorer = () => {
    localStorage.setItem(CLE_IGNOREE, '1');
    setEtat('fini');
  };

  return (
    <div className="mx-auto mt-4 w-full max-w-6xl px-4 md:px-8">
      <div className="flex flex-col gap-3 rounded-2xl border border-soleil bg-soleil-clair p-4 sm:flex-row sm:items-center">
        <p className="flex-1">
          Ce navigateur contient {locales.profils.length} profil(s) et {locales.voyages.length} voyage(s) saisis avant
          la création de ton compte. Les récupérer ?
          {etat === 'erreur' && <span className="block text-sm text-danger">La récupération a échoué.</span>}
        </p>
        <div className="flex gap-2">
          <Bouton variante="discret" onClick={ignorer}>
            Non merci
          </Bouton>
          <Bouton onClick={() => void recuperer()} desactive={etat === 'envoi'}>
            Récupérer
          </Bouton>
        </div>
      </div>
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
