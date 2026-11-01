'use client';

import { ReactNode } from 'react';
import { Contenu, EnTete } from '@/components/Coque';
import { useStore } from '@/store/store';

/** Affiche le contenu seulement pour l'équipe du catalogue (ou seulement les admins avec `admin`). */
export function ReserveEquipe({ admin, children }: { admin?: boolean; children: ReactNode }) {
  const role = useStore((s) => s.role);
  if (role === 'admin' || (role === 'editeur' && !admin)) return <>{children}</>;
  return (
    <>
      <EnTete titre="Administration" />
      <Contenu>
        <p className="text-discret">
          {admin ? 'Page réservée aux administrateurs.' : 'Page réservée à l’équipe qui gère le catalogue.'}
        </p>
      </Contenu>
    </>
  );
}
