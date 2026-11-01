'use client';

import { ChevronLeft, LogOut, Luggage, SlidersHorizontal, Users, WifiOff, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { Bouton } from '@/components/ui';
import { deconnecter, ONGLET } from '@/lib/api';
import { useStore } from '@/store/store';

const NAVIGATION = [
  { href: '/', libelle: 'Mes voyages', Icone: Luggage, actif: (p: string) => p === '/' || p.startsWith('/voyage') },
  { href: '/famille', libelle: 'Ma famille', Icone: Users, actif: (p: string) => p.startsWith('/famille') },
];
/** Visible seulement pour l'équipe du catalogue. */
const ADMINISTRATION = {
  href: '/admin',
  libelle: 'Catalogue',
  Icone: SlidersHorizontal,
  actif: (p: string) => p.startsWith('/admin'),
};

/**
 * Mise en page commune : menu latéral sur ordinateur et tablette, barre d'onglets en bas sur smartphone.
 * Charge les données du compte ; sans session, renvoie vers l'écran de connexion.
 */
export function Coque({ children }: { children: ReactNode }) {
  const chemin = usePathname();
  const router = useRouter();
  const statut = useStore((s) => s.statut);
  const email = useStore((s) => s.email);
  const role = useStore((s) => s.role);
  const charger = useStore((s) => s.charger);
  const surConnexion = chemin === '/connexion';

  useEffect(() => {
    void charger();
  }, [charger]);

  // Famille partagée : le serveur prévient en direct quand un autre appareil modifie quelque chose ; l'onglet
  // relit alors les données (regroupées si plusieurs changements arrivent d'un coup).
  const familleId = useStore((s) => s.familleId);
  useEffect(() => {
    if (statut !== 'pret' || !familleId || typeof EventSource === 'undefined') return;
    let attente: ReturnType<typeof setTimeout> | undefined;
    const source = new EventSource('/api/evenements');
    source.addEventListener('changement', (e) => {
      const { origine } = JSON.parse((e as MessageEvent<string>).data) as { origine?: string };
      if (origine === ONGLET) return;
      clearTimeout(attente);
      attente = setTimeout(() => void useStore.getState().rafraichir(), DELAI_REGROUPEMENT);
    });
    return () => {
      clearTimeout(attente);
      source.close();
    };
  }, [statut, familleId]);

  // En secours (connexion en direct coupée) : relecture régulière quand l'onglet est visible, et aussitôt
  // qu'on y revient.
  useEffect(() => {
    if (statut !== 'pret') return;
    const relire = () => {
      if (document.visibilityState === 'visible') void useStore.getState().rafraichir();
    };
    // Retour du réseau : envoie le pointage fait hors ligne, puis relit.
    const reseauRevenu = () => {
      const { envoyerPointages, rafraichir } = useStore.getState();
      void envoyerPointages().then(rafraichir);
    };
    const minuterie = setInterval(relire, INTERVALLE_RELECTURE);
    document.addEventListener('visibilitychange', relire);
    window.addEventListener('focus', relire);
    window.addEventListener('online', reseauRevenu);
    return () => {
      clearInterval(minuterie);
      document.removeEventListener('visibilitychange', relire);
      window.removeEventListener('focus', relire);
      window.removeEventListener('online', reseauRevenu);
    };
  }, [statut]);

  // Application installable et utilisable hors ligne (en production : en développement, le cache gênerait).
  const voyagesIds = useStore((s) => s.voyages.map((v) => v.id).join(','));
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  }, []);
  // Garde les pages des voyages, pour pointer hors ligne même dans un voyage pas encore ouvert sur cet appareil.
  useEffect(() => {
    if (statut !== 'pret' || !navigator.onLine || !('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;
    const urls = [
      '/',
      '/famille',
      ...voyagesIds
        .split(',')
        .filter(Boolean)
        .map((id) => `/voyage/${id}`),
    ];
    void navigator.serviceWorker.ready.then((r) => r.active?.postMessage({ type: 'prechauffer', urls }));
  }, [statut, voyagesIds]);

  useEffect(() => {
    if (statut === 'deconnecte' && !surConnexion) router.replace('/connexion');
    if (statut === 'pret' && surConnexion) router.replace('/');
  }, [statut, surConnexion, router]);

  if (surConnexion) return statut === 'pret' ? null : <>{children}</>;
  if (statut !== 'pret') {
    return <p className="p-10 text-center text-discret">{statut === 'chargement' ? 'Chargement…' : ''}</p>;
  }

  const navigation = role ? [...NAVIGATION, ADMINISTRATION] : NAVIGATION;

  const seDeconnecter = async () => {
    const enAttente = useStore.getState().pointagesEnAttente;
    if (
      enAttente > 0 &&
      !confirm(
        `${enAttente} pointage(s) fait(s) hors ligne ne sont pas encore enregistrés et seront perdus. Se déconnecter ?`,
      )
    ) {
      return;
    }
    await deconnecter().catch(() => undefined);
    useStore.getState().oublier();
    useStore.setState({ email: undefined, role: undefined, familleId: undefined });
  };

  return (
    <div className="min-h-dvh md:flex">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-1 border-r border-bordure bg-carte p-4 md:flex">
        <Link href="/" className="mb-6 px-2">
          <span className="block text-sm font-semibold text-discret">Tu as pris</span>
          <span className="block text-xl font-extrabold">mon maillot ? 🩱</span>
        </Link>
        {navigation.map(({ href, libelle, Icone, actif }) => (
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
        <BandeauHorsLigne />
        <InvitationsRecues />
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
        {navigation.map(({ href, libelle, Icone, actif }) => (
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

/** Relecture de secours, si la connexion en direct est coupée. */
const INTERVALLE_RELECTURE = 30_000;
/** Plusieurs changements reçus coup sur coup ne déclenchent qu'une relecture. */
const DELAI_REGROUPEMENT = 300;

/** Hors connexion : on peut continuer à cocher, l'envoi se fera au retour du réseau. */
function BandeauHorsLigne() {
  const horsLigne = useStore((s) => s.horsLigne);
  const enAttente = useStore((s) => s.pointagesEnAttente);
  if (!horsLigne) return null;
  return (
    <div role="status" className="mx-auto mt-4 flex w-full max-w-6xl items-center gap-3 px-4 md:px-8">
      <p className="flex flex-1 items-center gap-2 rounded-2xl border border-bordure bg-carte px-4 py-3 text-sm">
        <WifiOff size={18} className="shrink-0 text-discret" />
        <span>
          <strong>Hors connexion.</strong> Tu peux continuer à cocher la valise
          {enAttente > 0
            ? ` : ${enAttente} modification${enAttente > 1 ? 's' : ''} ${enAttente > 1 ? 'seront envoyées' : 'sera envoyée'} au retour du réseau.`
            : ', tout sera envoyé au retour du réseau.'}
        </span>
      </p>
    </div>
  );
}

/** Invitations à rejoindre la famille d'un autre compte : accepter ou refuser. */
function InvitationsRecues() {
  const invitations = useStore((s) => s.invitations);
  const vide = useStore((s) => s.profils.length === 0 && s.voyages.length === 0);
  const accepter = useStore((s) => s.accepterInvitation);
  const refuser = useStore((s) => s.refuserInvitation);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string>();

  if (!invitations.length) return null;

  const agir = async (action: () => Promise<void>) => {
    setOccupe(true);
    setErreur(undefined);
    try {
      await action();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setOccupe(false);
    }
  };

  return (
    <div className="mx-auto mt-4 flex w-full max-w-6xl flex-col gap-3 px-4 md:px-8">
      {invitations.map((i) => (
        <div
          key={i.id}
          className="flex flex-col gap-3 rounded-2xl border border-accent bg-accent-clair p-4 sm:flex-row sm:items-center"
        >
          <div className="flex-1">
            <p>
              <strong>{i.invitePar}</strong> t’invite à partager sa famille
              {i.prenoms.length > 0 && <> ({i.prenoms.join(', ')})</>} : mêmes voyages, et chacun coche ce qu’il met
              dans la valise.
            </p>
            {!vide && (
              <p className="text-sm text-discret">Tes profils et tes voyages actuels rejoindront cette famille.</p>
            )}
            {erreur && <p className="text-sm text-danger">{erreur}</p>}
          </div>
          <div className="flex gap-2">
            <Bouton variante="discret" desactive={occupe} onClick={() => void agir(() => refuser(i.id))}>
              Refuser
            </Bouton>
            <Bouton desactive={occupe} onClick={() => void agir(() => accepter(i.id))}>
              Rejoindre
            </Bouton>
          </div>
        </div>
      ))}
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
