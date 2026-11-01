'use client';

import { HABITUDES, trancheAge, TRANCHES } from '@maillot/domain';
import { ChevronRight, Plus } from 'lucide-react';
import Link from 'next/link';
import { Contenu, EnTete } from '@/components/Coque';
import { Avatar, couleurProfil } from '@/components/ui';
import { aujourdhuiIso } from '@/lib/dates';
import { useStore } from '@/store/store';

export default function Famille() {
  const profils = useStore((s) => s.profils);

  return (
    <>
      <EnTete titre="Ma famille" />
      <Contenu large>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {profils.map((p) => (
            <Link
              key={p.id}
              href={`/famille/${p.id}`}
              className="flex items-center gap-4 rounded-2xl border border-bordure bg-carte p-4 transition hover:border-accent/60"
            >
              <Avatar prenom={p.prenom} couleur={couleurProfil(p, profils)} taille={48} />
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold">{p.prenom}</p>
                <p className="text-sm text-discret">
                  {TRANCHES[trancheAge(p.anneeNaissance, aujourdhuiIso())]} · né(e) en {p.anneeNaissance}
                </p>
                {p.habitudes.length > 0 && (
                  <p className="truncate text-sm text-discret">{p.habitudes.map((h) => HABITUDES[h]).join(', ')}</p>
                )}
              </div>
              <ChevronRight size={20} className="text-discret" />
            </Link>
          ))}
          <Link
            href="/famille/nouveau"
            className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-accent p-4 font-semibold text-accent hover:bg-accent-clair"
          >
            <Plus size={20} /> Ajouter une personne
          </Link>
        </div>
      </Contenu>
    </>
  );
}
