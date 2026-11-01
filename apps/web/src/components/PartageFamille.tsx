'use client';

import { Crown, LogOut, Send, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Bouton, Carte, classeSaisie } from '@/components/ui';
import { api } from '@/lib/api';
import { useStore } from '@/store/store';

type Partage = {
  monRole: 'proprietaire' | 'membre';
  membres: { email: string; role: 'proprietaire' | 'membre'; moi: boolean }[];
  invitations: { email: string; invitePar: string; creeLe: string }[];
};

const enc = encodeURIComponent;

/** Membres de la famille, invitations en attente, et invitation d'une nouvelle personne. */
export function PartageFamille() {
  const quitterFamille = useStore((s) => s.quitterFamille);
  const familleId = useStore((s) => s.familleId);
  // Rechargée à chaque relecture : un membre ajouté ou une invitation refusée apparaît sans recharger la page.
  const revision = useStore((s) => s.revision);
  const [partage, setPartage] = useState<Partage>();
  const [email, setEmail] = useState('');
  const [erreur, setErreur] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [occupe, setOccupe] = useState(false);

  useEffect(() => {
    api<Partage>('/famille/partage')
      .then(setPartage)
      .catch((e: Error) => setErreur(e.message));
  }, [familleId, revision]);

  const agir = async (action: () => Promise<Partage | void>, succes?: string) => {
    setOccupe(true);
    setErreur(undefined);
    setMessage(undefined);
    try {
      const resultat = await action();
      if (resultat) setPartage(resultat);
      if (succes) setMessage(succes);
      return true;
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Erreur');
      return false;
    } finally {
      setOccupe(false);
    }
  };

  const inviter = async () => {
    const adresse = email.trim();
    const ok = await agir(
      () => api<Partage>('/famille/invitations', { methode: 'POST', corps: { email: adresse } }),
      `Invitation envoyée à ${adresse}.`,
    );
    if (ok) setEmail('');
  };

  if (!partage) {
    return (
      <Carte>
        <p className="text-discret">{erreur ?? 'Chargement…'}</p>
      </Carte>
    );
  }

  const proprietaire = partage.monRole === 'proprietaire';

  return (
    <Carte className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold">Préparer les valises à plusieurs</h2>
        <p className="text-sm text-discret">
          Les personnes invitées voient les mêmes profils et voyages, et cochent ce qu’elles mettent dans la valise.
          Chacun voit le pointage des autres en quelques secondes.
        </p>
      </div>

      <ul className="flex flex-col divide-y divide-bordure rounded-xl border border-bordure">
        {partage.membres.map((m) => (
          <li key={m.email} className="flex items-center gap-2 px-3 py-2.5">
            <span className="min-w-0 flex-1 truncate">
              {m.email}
              {m.moi && <span className="text-discret"> (toi)</span>}
            </span>
            <span className="text-sm text-discret">{m.role === 'proprietaire' ? 'Gère la famille' : 'Membre'}</span>
            {proprietaire && !m.moi && (
              <button
                type="button"
                aria-label={`Confier la famille à ${m.email}`}
                title="Confier la famille"
                disabled={occupe}
                onClick={() =>
                  confirm(
                    `Confier la famille à ${m.email} ? Cette personne pourra inviter et retirer des membres ; tu deviendras simple membre.`,
                  ) &&
                  void agir(
                    () => api<Partage>(`/famille/membres/${enc(m.email)}/proprietaire`, { methode: 'POST' }),
                    `${m.email} gère maintenant la famille.`,
                  )
                }
                className="rounded-full p-1.5 text-accent hover:bg-accent-clair"
              >
                <Crown size={18} />
              </button>
            )}
            {proprietaire && !m.moi && (
              <button
                type="button"
                aria-label={`Retirer ${m.email}`}
                disabled={occupe}
                onClick={() =>
                  confirm(`Retirer ${m.email} de la famille ? Cette personne n’aura plus accès à vos voyages.`) &&
                  void agir(() => api<Partage>(`/famille/membres/${enc(m.email)}`, { methode: 'DELETE' }))
                }
                className="rounded-full p-1.5 text-danger hover:bg-danger/10"
              >
                <Trash2 size={18} />
              </button>
            )}
          </li>
        ))}
        {partage.invitations.map((i) => (
          <li key={i.email} className="flex items-center gap-2 px-3 py-2.5">
            <span className="min-w-0 flex-1 truncate text-discret">{i.email}</span>
            <span className="text-sm text-discret">Invitation envoyée</span>
            {proprietaire && (
              <button
                type="button"
                aria-label={`Annuler l’invitation de ${i.email}`}
                disabled={occupe}
                onClick={() =>
                  void agir(() => api<Partage>(`/famille/invitations/${enc(i.email)}`, { methode: 'DELETE' }))
                }
                className="rounded-full p-1.5 text-danger hover:bg-danger/10"
              >
                <Trash2 size={18} />
              </button>
            )}
          </li>
        ))}
      </ul>

      {proprietaire ? (
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            void inviter();
          }}
        >
          <input
            type="email"
            className={`${classeSaisie} flex-1`}
            placeholder="adresse@exemple.fr"
            aria-label="Adresse e-mail de la personne à inviter"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Bouton type="submit" desactive={occupe || !email.includes('@')}>
            <Send size={18} /> Inviter
          </Bouton>
        </form>
      ) : (
        <Bouton
          variante="danger"
          desactive={occupe}
          onClick={() =>
            confirm(
              'Quitter cette famille ? Tu n’auras plus accès à ses voyages, et tu repartiras d’une famille vide.',
            ) && void agir(() => quitterFamille())
          }
        >
          <LogOut size={18} /> Quitter la famille
        </Bouton>
      )}

      {message && <p className="text-sm text-accent">{message}</p>}
      {erreur && <p className="text-sm text-danger">{erreur}</p>}
    </Carte>
  );
}
