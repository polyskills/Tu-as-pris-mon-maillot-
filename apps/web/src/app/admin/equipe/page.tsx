'use client';

import { Trash2, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ReserveEquipe } from '@/components/admin/ReserveEquipe';
import { Contenu, EnTete } from '@/components/Coque';
import { Bouton, Carte, ChoixUnique, classeSaisie } from '@/components/ui';
import { adminApi, Equipier, ROLES } from '@/lib/admin';
import { Role, useStore } from '@/store/store';

export default function PageEquipe() {
  return (
    <ReserveEquipe admin>
      <Equipe />
    </ReserveEquipe>
  );
}

function Equipe() {
  const moi = useStore((s) => s.email);
  const [equipe, setEquipe] = useState<Equipier[]>();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('editeur');
  const [erreur, setErreur] = useState<string>();

  useEffect(() => {
    adminApi
      .equipe()
      .then(setEquipe)
      .catch((e: Error) => setErreur(e.message));
  }, []);

  const agir = async (action: () => Promise<Equipier[]>) => {
    setErreur(undefined);
    try {
      setEquipe(await action());
      return true;
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Erreur');
      return false;
    }
  };

  const ajouter = async () => {
    if (await agir(() => adminApi.enregistrerEquipier(email.trim(), role))) setEmail('');
  };

  return (
    <>
      <EnTete titre="Équipe du catalogue" retour="/admin" />
      <Contenu>
        <div className="flex flex-col gap-5">
          <p className="text-sm text-discret">
            Les éditeurs modifient le catalogue. Les admins gèrent aussi l’équipe. La personne se connecte avec cette
            adresse pour accéder à l’administration.
          </p>

          <Carte className="flex flex-col gap-3">
            <h2 className="font-bold">Ajouter une personne</h2>
            <input
              type="email"
              className={classeSaisie}
              placeholder="adresse@exemple.fr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <ChoixUnique options={ROLES} valeur={role} onChange={setRole} />
            <Bouton onClick={() => void ajouter()} desactive={!email.includes('@')}>
              <UserPlus size={18} /> Ajouter
            </Bouton>
          </Carte>

          {erreur && <p className="text-danger">{erreur}</p>}

          {!equipe ? (
            <p className="text-discret">Chargement…</p>
          ) : (
            <ul className="flex flex-col divide-y divide-bordure rounded-2xl border border-bordure bg-carte">
              {equipe.map((e) => (
                <li key={e.email} className="flex flex-col gap-2 px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate font-semibold">{e.email}</span>
                    {!e.fixe && e.email !== moi && (
                      <button
                        type="button"
                        aria-label={`Retirer ${e.email}`}
                        onClick={() =>
                          confirm(`Retirer ${e.email} de l’équipe ?`) &&
                          void agir(() => adminApi.retirerEquipier(e.email))
                        }
                        className="rounded-full p-1.5 text-danger hover:bg-danger/10"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                  {e.fixe ? (
                    <span className="text-sm text-discret">
                      Admin fixé par la configuration du serveur (ADMIN_EMAILS)
                    </span>
                  ) : (
                    <>
                      <ChoixUnique
                        options={ROLES}
                        valeur={e.role}
                        onChange={(r) => void agir(() => adminApi.enregistrerEquipier(e.email, r))}
                      />
                      {e.ajoutePar && <span className="text-xs text-discret">Ajouté par {e.ajoutePar}</span>}
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Contenu>
    </>
  );
}
