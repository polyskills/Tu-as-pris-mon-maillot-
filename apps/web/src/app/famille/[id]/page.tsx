'use client';

import {
  ArticlePerso,
  Categorie,
  CATEGORIES,
  Habitude,
  HABITUDES,
  habitudesParDefaut,
  habitudesProposees,
  Profil,
  Sexe,
  SEXES,
  trancheAge,
} from '@maillot/domain';
import { X } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Contenu, EnTete } from '@/components/Coque';
import {
  Avatar,
  Bouton,
  Carte,
  Champ,
  ChoixPuces,
  ChoixUnique,
  classeSaisie,
  COULEURS_PROFIL,
  couleurProfil,
} from '@/components/ui';
import { aujourdhuiIso } from '@/lib/dates';
import { nouvelId, useStore } from '@/store/store';

// Catégories qu'on peut confier à quelqu'un pour les affaires communes.
const RESPONSABILITES = Object.fromEntries(
  (['papiers', 'sante', 'electronique', 'toilette', 'bebe', 'voyage', 'maison', 'loisirs'] as Categorie[]).map((c) => [
    c,
    CATEGORIES[c],
  ]),
) as Record<Categorie, string>;

export default function EditionProfil() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const profils = useStore((s) => s.profils);
  const existant = profils.find((p) => p.id === id);
  const enregistrer = useStore((s) => s.enregistrerProfil);
  const supprimer = useStore((s) => s.supprimerProfil);

  const [prenom, setPrenom] = useState(existant?.prenom ?? '');
  const [couleur, setCouleur] = useState(
    existant ? couleurProfil(existant, profils) : COULEURS_PROFIL[profils.length % COULEURS_PROFIL.length],
  );
  const [annee, setAnnee] = useState(existant ? String(existant.anneeNaissance) : '');
  const [sexe, setSexe] = useState<Sexe | 'nc'>(existant?.sexe ?? 'nc');
  const [habitudes, setHabitudes] = useState<Habitude[]>(existant?.habitudes ?? []);
  // Tant qu'on n'a pas touché aux habitudes d'un nouveau profil, l'âge les pré-coche.
  const [habitudesTouchees, setHabitudesTouchees] = useState(!!existant);
  const [responsabilites, setResponsabilites] = useState<Categorie[]>(existant?.responsabilites ?? []);
  const [articlesPerso, setArticlesPerso] = useState<ArticlePerso[]>(existant?.articlesPerso ?? []);
  const [nouvelArticle, setNouvelArticle] = useState('');

  const changerAnnee = (texte: string) => {
    setAnnee(texte);
    if (!habitudesTouchees && /^\d{4}$/.test(texte)) {
      setHabitudes(habitudesParDefaut(Number(texte), new Date().getFullYear()));
    }
  };

  const anneeNum = Number(annee);
  const anneeValide = /^\d{4}$/.test(annee) && anneeNum > 1900 && anneeNum <= new Date().getFullYear();
  const valide = prenom.trim().length > 0 && anneeValide;
  const tranche = anneeValide ? trancheAge(anneeNum, aujourdhuiIso()) : undefined;
  // Seules les habitudes adaptées à l'âge (et au sexe s'il est précisé) sont proposées et enregistrées.
  const listeProposee = tranche ? habitudesProposees(tranche, sexe === 'nc' ? undefined : sexe) : undefined;
  const proposees = listeProposee
    ? (Object.fromEntries(listeProposee.map((h) => [h, HABITUDES[h]])) as Record<Habitude, string>)
    : undefined;
  const habitudesRetenues = listeProposee ? habitudes.filter((h) => listeProposee.includes(h)) : habitudes;
  // Les affaires communes se confient à partir de 12 ans.
  const peutGererCommun = tranche !== 'bebe' && tranche !== 'enfant';

  const valider = () => {
    const profil: Profil = {
      id: existant?.id ?? nouvelId(),
      prenom: prenom.trim(),
      couleur,
      anneeNaissance: anneeNum,
      ...(sexe !== 'nc' && { sexe }),
      habitudes: habitudesRetenues,
      responsabilites: peutGererCommun ? responsabilites : [],
      articlesPerso,
    };
    enregistrer(profil);
    router.push('/famille');
  };

  const ajouterArticlePerso = () => {
    const nom = nouvelArticle.trim();
    if (!nom) return;
    setArticlesPerso([...articlesPerso, { id: nouvelId(), nom, categorie: 'loisirs', quantite: 1 }]);
    setNouvelArticle('');
  };

  const confirmerSuppression = () => {
    if (!existant) return;
    if (window.confirm(`Supprimer ${existant.prenom} ?\n\nSes articles seront retirés des voyages.`)) {
      supprimer(existant.id);
      router.push('/famille');
    }
  };

  return (
    <>
      <EnTete titre={existant ? existant.prenom : 'Nouvelle personne'} retour="/famille" />
      <Contenu>
        <form
          className="flex flex-col gap-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (valide) valider();
          }}
        >
          <div className="flex flex-col items-center gap-3">
            <Avatar prenom={prenom || '?'} couleur={couleur} taille={72} />
            <div className="flex gap-2">
              {COULEURS_PROFIL.map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-label={`Couleur ${k}`}
                  onClick={() => setCouleur(k)}
                  className="h-7 w-7 rounded-full border-[3px]"
                  style={{ backgroundColor: k, borderColor: k === couleur ? 'var(--texte)' : 'transparent' }}
                />
              ))}
            </div>
          </div>

          <Carte className="grid gap-5 md:grid-cols-2">
            <Champ libelle="Prénom">
              <input
                className={classeSaisie}
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                placeholder="Léa"
                autoFocus={!existant}
              />
            </Champ>
            <Champ libelle="Année de naissance">
              <input
                className={classeSaisie}
                value={annee}
                onChange={(e) => changerAnnee(e.target.value.replace(/\D/g, ''))}
                placeholder="2018"
                inputMode="numeric"
                maxLength={4}
              />
            </Champ>
            <div className="md:col-span-2">
              <Champ libelle="Sexe" aide="Facultatif : sert à proposer certains vêtements et habitudes.">
                <ChoixUnique options={SEXES} valeur={sexe} onChange={setSexe} />
              </Champ>
            </div>
          </Carte>

          <Carte>
            <Champ libelle="Habitudes et besoins">
              {proposees ? (
                <ChoixPuces
                  options={proposees}
                  valeur={habitudesRetenues}
                  onChange={(h) => {
                    setHabitudes(h);
                    setHabitudesTouchees(true);
                  }}
                />
              ) : (
                <p className="text-sm text-discret">
                  Indique l’année de naissance pour voir les habitudes adaptées à l’âge.
                </p>
              )}
            </Champ>
          </Carte>

          {peutGererCommun && (
            <Carte>
              <Champ
                libelle="S'occupe des affaires communes"
                aide="Ex. : c'est elle qui gère les papiers et la trousse de secours."
              >
                <ChoixPuces options={RESPONSABILITES} valeur={responsabilites} onChange={setResponsabilites} />
              </Champ>
            </Carte>
          )}

          <Carte>
            <Champ
              libelle="Toujours dans sa valise"
              aide="Ce que cette personne emporte à chaque fois, en plus de la base."
            >
              {articlesPerso.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 py-1">
                  <span>{a.nom}</span>
                  <button
                    type="button"
                    aria-label={`Retirer ${a.nom}`}
                    onClick={() => setArticlesPerso(articlesPerso.filter((x) => x.id !== a.id))}
                    className="rounded-full p-1 text-danger hover:bg-danger/10"
                  >
                    <X size={18} />
                  </button>
                </div>
              ))}
              <input
                className={classeSaisie}
                value={nouvelArticle}
                onChange={(e) => setNouvelArticle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    ajouterArticlePerso();
                  }
                }}
                placeholder="Ex. : mon oreiller, la peluche lapin… (Entrée pour ajouter)"
              />
            </Champ>
          </Carte>

          <div className="flex flex-col gap-3 sm:flex-row-reverse">
            <Bouton type="submit" desactive={!valide} className="sm:min-w-48">
              Enregistrer
            </Bouton>
            {existant && (
              <Bouton variante="danger" onClick={confirmerSuppression}>
                Supprimer
              </Bouton>
            )}
          </div>
        </form>
      </Contenu>
    </>
  );
}
