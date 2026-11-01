'use client';

import { Check, Minus, Plus, X } from 'lucide-react';
import { ReactNode, useEffect } from 'react';

const cx = (...classes: (string | false | undefined)[]) => classes.filter(Boolean).join(' ');

export function Bouton({
  children,
  onClick,
  variante = 'plein',
  desactive,
  className,
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  variante?: 'plein' | 'contour' | 'danger' | 'discret';
  desactive?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={desactive}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-base font-semibold transition',
        'disabled:cursor-not-allowed disabled:opacity-45 enabled:active:scale-[0.98]',
        variante === 'plein' && 'bg-accent text-accent-texte enabled:hover:brightness-110',
        variante === 'contour' && 'border border-accent text-accent enabled:hover:bg-accent-clair',
        variante === 'danger' && 'border border-danger text-danger enabled:hover:bg-danger/10',
        variante === 'discret' && 'text-discret enabled:hover:bg-bordure/50',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Puce({ libelle, actif, onClick }: { libelle: string; actif: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actif}
      className={cx(
        'rounded-full border px-3 py-2 text-sm transition',
        actif
          ? 'border-accent bg-accent-clair font-semibold text-accent'
          : 'border-bordure bg-carte text-texte hover:border-accent/50',
      )}
    >
      {libelle}
    </button>
  );
}

export function ChoixPuces<K extends string>({
  options,
  valeur,
  onChange,
}: {
  options: Record<K, string>;
  valeur: K[];
  onChange: (v: K[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(options) as K[]).map((k) => (
        <Puce
          key={k}
          libelle={options[k]}
          actif={valeur.includes(k)}
          onClick={() => onChange(valeur.includes(k) ? valeur.filter((x) => x !== k) : [...valeur, k])}
        />
      ))}
    </div>
  );
}

export function ChoixUnique<K extends string>({
  options,
  valeur,
  onChange,
}: {
  options: Record<K, string>;
  valeur: K;
  onChange: (v: K) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(options) as K[]).map((k) => (
        <Puce key={k} libelle={options[k]} actif={valeur === k} onClick={() => onChange(k)} />
      ))}
    </div>
  );
}

export function Champ({ libelle, aide, children }: { libelle: string; aide?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-semibold">{libelle}</span>
      {aide && <span className="-mt-1 text-sm text-discret">{aide}</span>}
      {children}
    </div>
  );
}

export const classeSaisie =
  'w-full rounded-xl border border-bordure bg-carte px-3 py-2.5 text-base text-texte placeholder:text-discret focus:border-accent focus:outline-none';

export function Interrupteur({
  libelle,
  aide,
  valeur,
  onChange,
}: {
  libelle: string;
  aide?: string;
  valeur: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <span>
        <span className="block font-semibold">{libelle}</span>
        {aide && <span className="block text-sm text-discret">{aide}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={valeur}
        onClick={() => onChange(!valeur)}
        className={cx('relative h-7 w-12 shrink-0 rounded-full transition', valeur ? 'bg-accent' : 'bg-bordure')}
      >
        <span
          className={cx(
            'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all',
            valeur ? 'left-[22px]' : 'left-0.5',
          )}
        />
      </button>
    </label>
  );
}

export function Compteur({
  valeur,
  onChange,
  min = 0,
  suffixe,
}: {
  valeur: number;
  onChange: (v: number) => void;
  min?: number;
  suffixe?: string;
}) {
  const rond =
    'flex h-10 w-10 items-center justify-center rounded-full border border-accent text-accent hover:bg-accent-clair';
  return (
    <div className="flex items-center gap-4">
      <button type="button" aria-label="Moins" className={rond} onClick={() => onChange(Math.max(min, valeur - 1))}>
        <Minus size={18} />
      </button>
      <span className="min-w-8 text-center text-xl font-bold">
        {valeur}
        {suffixe && <span className="ml-1 text-sm font-normal text-discret">{suffixe}</span>}
      </span>
      <button type="button" aria-label="Plus" className={rond} onClick={() => onChange(valeur + 1)}>
        <Plus size={18} />
      </button>
    </div>
  );
}

export function BarreProgression({ faits, total, fine }: { faits: number; total: number; fine?: boolean }) {
  const ratio = total === 0 ? 0 : faits / total;
  return (
    <div className={cx('overflow-hidden rounded-full bg-bordure', fine ? 'h-1.5' : 'h-2')}>
      <div
        className={cx('h-full rounded-full transition-all', ratio === 1 ? 'bg-succes' : 'bg-accent')}
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  );
}

/** Rond de couleur avec l'initiale. `fini` ajoute une coche verte. */
export function Avatar({
  prenom,
  couleur,
  taille = 36,
  fini,
}: {
  prenom: string;
  couleur: string;
  taille?: number;
  fini?: boolean;
}) {
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{ width: taille, height: taille, backgroundColor: couleur, fontSize: taille * 0.45 }}
    >
      {prenom.slice(0, 1).toUpperCase()}
      {fini && (
        <span
          className="absolute -right-1 -bottom-1 flex items-center justify-center rounded-full border-2 border-carte bg-succes"
          style={{ width: taille * 0.45, height: taille * 0.45 }}
        >
          <Check size={taille * 0.28} strokeWidth={4} />
        </span>
      )}
    </span>
  );
}

export function Carte({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const classes = cx('rounded-2xl border border-bordure bg-carte p-4', className);
  return onClick ? (
    <button type="button" onClick={onClick} className={cx(classes, 'text-left transition hover:border-accent/60')}>
      {children}
    </button>
  ) : (
    <div className={classes}>{children}</div>
  );
}

/** Panneau en bas d'écran sur mobile, fenêtre centrée sur grand écran. */
export function Feuille({ titre, fermer, children }: { titre: string; fermer: () => void; children: ReactNode }) {
  useEffect(() => {
    const echap = (e: KeyboardEvent) => e.key === 'Escape' && fermer();
    window.addEventListener('keydown', echap);
    return () => window.removeEventListener('keydown', echap);
  }, [fermer]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={fermer}>
      <div
        role="dialog"
        aria-label={titre}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90dvh] w-full flex-col gap-3 overflow-y-auto rounded-t-3xl bg-carte p-5 pb-8 sm:max-w-md sm:rounded-3xl sm:pb-5"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold">{titre}</h2>
          <button
            type="button"
            onClick={fermer}
            aria-label="Fermer"
            className="rounded-full p-1 text-discret hover:bg-bordure/60"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const COULEURS_PROFIL = ['#E76F51', '#2A9D8F', '#8E6CEF', '#F4A261', '#3A86FF', '#E5539B', '#43AA8B', '#B08968'];

export const couleurProfil = (p: { id: string; couleur?: string }, profils: { id: string }[]) =>
  p.couleur ??
  COULEURS_PROFIL[
    Math.max(
      0,
      profils.findIndex((x) => x.id === p.id),
    ) % COULEURS_PROFIL.length
  ];
