'use client';

import { Mail } from 'lucide-react';
import { useState } from 'react';
import { LiensLegaux } from '@/components/PageLegale';
import { Bouton, Carte, classeSaisie } from '@/components/ui';
import { demanderLien } from '@/lib/api';

export default function Connexion() {
  const [email, setEmail] = useState('');
  const [etat, setEtat] = useState<'saisie' | 'envoi' | 'envoye' | 'erreur'>('saisie');
  const valide = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const envoyer = async () => {
    if (!valide) return;
    setEtat('envoi');
    try {
      await demanderLien(email.trim());
      setEtat('envoye');
    } catch {
      setEtat('erreur');
    }
  };

  return (
    <main className="mx-auto flex min-h-[80dvh] w-full max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div>
        <p className="font-semibold text-discret">Tu as pris</p>
        <h1 className="text-3xl font-extrabold">mon maillot ? 🩱</h1>
      </div>

      {etat === 'envoye' ? (
        <Carte className="flex flex-col items-center gap-3 text-center">
          <Mail size={40} className="text-accent" />
          <h2 className="text-xl font-bold">Vérifie ta boîte mail</h2>
          <p>
            Un lien de connexion vient d’être envoyé à <strong>{email.trim()}</strong>. Il est valable 15 minutes.
          </p>
          <Bouton variante="discret" onClick={() => setEtat('saisie')}>
            Utiliser une autre adresse
          </Bouton>
        </Carte>
      ) : (
        <Carte>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void envoyer();
            }}
          >
            <h2 className="text-xl font-bold">Connexion</h2>
            <p className="text-discret">Pas de mot de passe : tu reçois un lien de connexion par e-mail.</p>
            <input
              type="email"
              className={classeSaisie}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ton.adresse@exemple.fr"
              autoComplete="email"
              autoFocus
            />
            {etat === 'erreur' && (
              <p className="text-sm text-danger">L’envoi n’a pas fonctionné. Réessaie dans un instant.</p>
            )}
            <Bouton type="submit" desactive={!valide || etat === 'envoi'}>
              {etat === 'envoi' ? 'Envoi…' : 'Recevoir mon lien'}
            </Bouton>
          </form>
        </Carte>
      )}
      <LiensLegaux className="text-center" />
    </main>
  );
}
