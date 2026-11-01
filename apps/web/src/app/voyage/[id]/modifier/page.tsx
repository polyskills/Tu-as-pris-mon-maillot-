'use client';

import { useParams } from 'next/navigation';
import { Contenu, EnTete } from '@/components/Coque';
import { QuestionnaireVoyage } from '@/components/QuestionnaireVoyage';
import { useStore } from '@/store/store';

export default function ModifierVoyage() {
  const { id } = useParams<{ id: string }>();
  const voyage = useStore((s) => s.voyages.find((v) => v.id === id));

  if (!voyage) {
    return (
      <>
        <EnTete titre="Voyage introuvable" retour="/" />
        <Contenu>
          <p className="text-discret">Ce voyage n’existe pas ou a été supprimé.</p>
        </Contenu>
      </>
    );
  }
  return <QuestionnaireVoyage existant={voyage} />;
}
