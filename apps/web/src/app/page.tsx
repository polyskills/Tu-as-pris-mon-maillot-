'use client';

import { motifDe, progression, Voyage } from '@maillot/domain';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { Contenu } from '@/components/Coque';
import { Avatar, BarreProgression, Carte, couleurProfil } from '@/components/ui';
import { dateCourte, joursAvant, plusJours } from '@/lib/dates';
import { useStore } from '@/store/store';

function compteARebours(v: Voyage): string {
  const j = joursAvant(v.depart);
  if (j > 1) return `J-${j}`;
  if (j === 1) return 'Demain';
  if (j === 0) return "Aujourd'hui";
  return joursAvant(plusJours(v.depart, v.nuits)) >= 0 ? 'En cours' : 'Terminé';
}

const estPasse = (v: Voyage) => joursAvant(plusJours(v.depart, v.nuits)) < 0;

export default function Accueil() {
  const voyages = useStore((s) => s.voyages);
  const profils = useStore((s) => s.profils);

  const aVenir = voyages.filter((v) => !estPasse(v)).sort((a, b) => a.depart.localeCompare(b.depart));
  const passes = voyages.filter(estPasse).sort((a, b) => b.depart.localeCompare(a.depart));

  const carte = (v: Voyage) => {
    const p = progression(v.articles.filter((a) => a.liste === 'valise'));
    const passe = estPasse(v);
    return (
      <Link
        key={v.id}
        href={`/voyage/${v.id}`}
        className={`flex flex-col gap-2 rounded-2xl border border-bordure bg-carte p-4 transition hover:border-accent/60 ${
          passe ? 'opacity-60' : ''
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="truncate text-lg font-bold">{v.nom}</h3>
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-sm font-extrabold ${
              passe ? 'bg-bordure text-texte' : 'bg-soleil text-[#1b1f2a]'
            }`}
          >
            {compteARebours(v)}
          </span>
        </div>
        <p className="text-sm text-discret">
          {motifDe(v) === 'travail' && '💼 Travail · '}
          {dateCourte(v.depart)} · {v.nuits} nuit{v.nuits > 1 ? 's' : ''}
        </p>
        <div className="flex gap-1">
          {profils
            .filter((x) => v.participants.includes(x.id))
            .map((x) => (
              <Avatar key={x.id} prenom={x.prenom} couleur={couleurProfil(x, profils)} taille={24} />
            ))}
        </div>
        <BarreProgression faits={p.faits} total={p.total} />
        <p className="text-sm text-discret">
          {p.restants === 0 ? '✅ Valise bouclée' : `${p.faits} / ${p.total} dans la valise`}
        </p>
      </Link>
    );
  };

  return (
    <Contenu large>
      <div className="mb-6 md:hidden">
        <p className="font-semibold text-discret">Tu as pris</p>
        <p className="text-3xl font-extrabold">mon maillot ? 🩱</p>
      </div>

      {profils.length === 0 ? (
        <Carte className="flex max-w-xl flex-col gap-4">
          <h2 className="text-xl font-bold">Bienvenue 👋</h2>
          <p>
            Commence par décrire ta famille : prénom, âge et habitudes de chacun. Tu ne le fais qu’une fois, ça sert
            pour tous les voyages.
          </p>
          <Link
            href="/famille/nouveau"
            className="rounded-xl bg-accent px-4 py-3 text-center font-semibold text-accent-texte hover:brightness-110"
          >
            Créer ma famille
          </Link>
        </Carte>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="hidden text-2xl font-extrabold md:block">Mes voyages</h1>
            <Link
              href="/voyage/nouveau"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 font-semibold text-accent-texte hover:brightness-110"
            >
              <Plus size={20} /> Nouveau voyage
            </Link>
          </div>

          {voyages.length === 0 && <p className="py-10 text-center text-discret">Aucun voyage pour l’instant.</p>}

          {aVenir.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-bold tracking-wide text-discret uppercase">À venir</h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{aVenir.map(carte)}</div>
            </section>
          )}
          {passes.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-bold tracking-wide text-discret uppercase">Voyages passés</h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{passes.map(carte)}</div>
            </section>
          )}
        </div>
      )}
    </Contenu>
  );
}
