'use client';

import { Download, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Contenu, EnTete } from '@/components/Coque';
import { Bouton, Carte, classeSaisie } from '@/components/ui';
import { api } from '@/lib/api';
import { useStore } from '@/store/store';

/** Mon compte : export des données et suppression du compte (droits RGPD). */
export default function Compte() {
  const email = useStore((s) => s.email);
  const oublier = useStore((s) => s.oublier);
  const [confirmation, setConfirmation] = useState('');
  const [erreur, setErreur] = useState<string>();
  const [occupe, setOccupe] = useState(false);

  const supprimer = async () => {
    setOccupe(true);
    setErreur(undefined);
    try {
      await api('/moi', { methode: 'DELETE' });
      oublier();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Erreur');
      setOccupe(false);
    }
  };

  return (
    <>
      <EnTete titre="Mon compte" />
      <Contenu>
        <div className="flex flex-col gap-5">
          <Carte className="flex flex-col gap-1">
            <p className="text-sm text-discret">Connecté avec</p>
            <p className="text-lg font-semibold break-all">{email}</p>
          </Carte>

          <Carte className="flex flex-col gap-3">
            <h2 className="text-lg font-bold">Mes données</h2>
            <p className="text-sm text-discret">
              Télécharge tout ce que l’application garde sur toi et ta famille : compte, membres, profils, voyages et
              pointage, dans un fichier lisible (JSON).
            </p>
            <a
              href="/api/moi/export"
              download
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-accent px-4 py-3 font-semibold text-accent hover:bg-accent-clair"
            >
              <Download size={18} /> Télécharger mes données
            </a>
          </Carte>

          <Carte className="flex flex-col gap-3 border-danger/50">
            <h2 className="text-lg font-bold text-danger">Supprimer mon compte</h2>
            <p className="text-sm">
              Ton compte est supprimé définitivement. Si tu es seul dans ta famille, ses profils et voyages le sont
              aussi. Si elle est partagée, elle reste aux autres membres ; si c’est toi qui la gères,{' '}
              <Link href="/famille" className="font-semibold text-accent">
                confie-la d’abord
              </Link>{' '}
              à un autre membre.
            </p>
            <label className="flex flex-col gap-1 text-sm">
              Pour confirmer, écris ton adresse e-mail :
              <input
                type="email"
                className={classeSaisie}
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                autoComplete="off"
              />
            </label>
            <Bouton
              variante="danger"
              desactive={occupe || confirmation.trim().toLowerCase() !== email?.toLowerCase()}
              onClick={() => void supprimer()}
            >
              <Trash2 size={18} /> Supprimer définitivement mon compte
            </Bouton>
            {erreur && <p className="text-sm text-danger">{erreur}</p>}
          </Carte>
        </div>
      </Contenu>
    </>
  );
}
