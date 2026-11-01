'use client';

import {
  ACTIVITES,
  ACTIVITES_TRAVAIL,
  CLIMATS,
  DESTINATIONS,
  genererArticles,
  HEBERGEMENTS,
  Motif,
  motifDe,
  MOTIFS,
  ParametresVoyage,
  trancheAge,
  TRANSPORTS,
  Voyage,
  ZONES,
} from '@maillot/domain';
import { Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ReactNode, useState } from 'react';
import { Contenu, EnTete } from '@/components/Coque';
import {
  Avatar,
  Bouton,
  Carte,
  Champ,
  ChoixPuces,
  ChoixUnique,
  classeSaisie,
  Compteur,
  couleurProfil,
  Interrupteur,
} from '@/components/ui';
import { aujourdhuiIso, dateLongue, dateValide, plusJours } from '@/lib/dates';
import { useStore } from '@/store/store';

// On retire id, creeLe et articles : seuls les paramètres sont modifiables ici.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const parametres = ({ id, creeLe, articles, ...p }: Voyage): ParametresVoyage => p;
const ETAPES = ['Où ?', 'Quand ?', 'Qui ?', 'Comment ?', 'Résumé'];
const liste = <K extends string>(cles: K[], libelles: Record<K, string>) =>
  cles.length ? cles.map((k) => libelles[k]).join(', ') : '—';

/**
 * Création ou modification d'un voyage.
 * Smartphone : une étape à la fois. Ordinateur : tout sur une page, résumé à droite.
 */
export function QuestionnaireVoyage({ existant }: { existant?: Voyage }) {
  const router = useRouter();
  const profils = useStore((s) => s.profils);
  const catalogue = useStore((s) => s.catalogue);
  const creer = useStore((s) => s.creerVoyage);
  const modifier = useStore((s) => s.modifierVoyage);
  const supprimer = useStore((s) => s.supprimerVoyage);

  const [etape, setEtape] = useState(0);
  // On ne garde que les paramètres : la liste d'articles reste celle du store.
  const [p, setP] = useState<ParametresVoyage>(() =>
    existant
      ? parametres(existant)
      : {
          motif: 'vacances',
          nom: '',
          depart: aujourdhuiIso(),
          nuits: 7,
          destinations: [],
          climat: 'tempere',
          zone: 'france',
          transports: ['voiture'],
          hebergement: 'location',
          machineALaver: false,
          activites: [],
          participants: profils.map((x) => x.id),
        },
  );
  const maj = <K extends keyof ParametresVoyage>(cle: K, valeur: ParametresVoyage[K]) => setP({ ...p, [cle]: valeur });
  const travail = motifDe(p) === 'travail';
  /** Activités proposées : en travail, pas de loisirs. */
  const activitesProposees = travail
    ? (Object.fromEntries(ACTIVITES_TRAVAIL.map((a) => [a, ACTIVITES[a]])) as Record<
        (typeof ACTIVITES_TRAVAIL)[number],
        string
      >)
    : ACTIVITES;

  /** En travail, on part seul : une seule personne (de préférence un adulte), sans activités de loisir. */
  const changerMotif = (motif: Motif) => {
    if (motif === 'vacances') return setP({ ...p, motif });
    const adulte = profils.find(
      (x) => p.participants.includes(x.id) && ['adulte', 'senior'].includes(trancheAge(x.anneeNaissance, p.depart)),
    );
    const seul = p.participants.length === 1 ? p.participants : [(adulte ?? profils[0])?.id].filter(Boolean);
    setP({
      ...p,
      motif,
      participants: seul as string[],
      activites: p.activites.filter((a) => ACTIVITES_TRAVAIL.includes(a)),
      ...(!existant && p.hebergement === 'location' && { hebergement: 'hotel' }),
    });
  };

  const participantsValides = travail ? p.participants.length === 1 : p.participants.length > 0;
  const etapeValide = [p.nom.trim().length > 0, dateValide(p.depart), participantsValides, true, true];
  const toutValide = etapeValide.every(Boolean);

  const valider = () => {
    if (!toutValide) return;
    const params = { ...p, nom: p.nom.trim() };
    if (existant) {
      modifier(existant.id, params);
      router.push(`/voyage/${existant.id}`);
    } else {
      router.replace(`/voyage/${creer(params)}`);
    }
  };

  const confirmerSuppression = () => {
    if (existant && window.confirm(`Supprimer « ${existant.nom} » ?\n\nLa liste et le pointage seront perdus.`)) {
      supprimer(existant.id);
      router.replace('/');
    }
  };

  // Une section est toujours visible sur grand écran, seulement à son étape sur smartphone.
  const section = (i: number, contenu: ReactNode) => (
    <Carte className={`flex flex-col gap-5 ${etape === i ? '' : 'hidden lg:flex'}`}>
      <h2 className="text-xl font-extrabold lg:text-lg">{ETAPES[i]}</h2>
      {contenu}
    </Carte>
  );

  const apercu = genererArticles(p, profils, catalogue);
  const noms = profils.filter((x) => p.participants.includes(x.id)).map((x) => x.prenom);
  const lignes: [string, string, number][] = [
    ['Voyage', `${p.nom || '—'} · ${MOTIFS[motifDe(p)]}`, 0],
    ['Destination', `${liste(p.destinations, DESTINATIONS)} · ${CLIMATS[p.climat]} · ${ZONES[p.zone]}`, 0],
    ['Dates', dateValide(p.depart) ? `${dateLongue(p.depart)} · ${p.nuits} nuit${p.nuits > 1 ? 's' : ''}` : '—', 1],
    ['Participants', noms.join(', ') || '—', 2],
    [
      'Trajet et séjour',
      `${liste(p.transports, TRANSPORTS)} · ${HEBERGEMENTS[p.hebergement]}${p.machineALaver ? ' · machine à laver' : ''}`,
      3,
    ],
    ['Activités', liste(p.activites, ACTIVITES), 3],
  ];
  const nbCourses = apercu.filter((x) => x.liste === 'courses').length;
  const nbVoiture = apercu.filter((x) => x.liste === 'voiture').length;

  const resume = (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col divide-y divide-bordure lg:hidden">
        {lignes.map(([titre, valeur, cible]) => (
          <button
            key={titre}
            type="button"
            onClick={() => setEtape(cible)}
            className="flex items-center gap-3 py-2 text-left"
          >
            <span className="flex-1">
              <span className="block text-sm text-discret">{titre}</span>
              <span className="block">{valeur}</span>
            </span>
            <span className="text-accent">Modifier</span>
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-1 rounded-2xl bg-soleil-clair p-4">
        <p className="text-lg font-bold">{apercu.filter((x) => x.liste === 'valise').length} articles dans la valise</p>
        {(nbCourses > 0 || nbVoiture > 0) && (
          <p>
            {[nbCourses && `${nbCourses} à acheter sur place`, nbVoiture && `${nbVoiture} points de check-list voiture`]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}
        <p className="text-sm text-discret">
          {existant ? 'Ce qui est déjà pointé sera conservé.' : 'Tu pourras retirer ou ajouter des articles ensuite.'}
        </p>
      </div>
      <Bouton onClick={valider} desactive={!toutValide}>
        {existant ? 'Mettre à jour la liste' : 'Générer la liste'}
      </Bouton>
      {existant && (
        <Bouton variante="danger" onClick={confirmerSuppression}>
          Supprimer le voyage
        </Bouton>
      )}
    </div>
  );

  return (
    <>
      <EnTete
        titre={existant ? 'Modifier le voyage' : 'Nouveau voyage'}
        retour={existant ? `/voyage/${existant.id}` : '/'}
      />

      <div className="border-b border-bordure bg-carte lg:hidden">
        <div className="mx-auto flex max-w-2xl gap-1.5 px-4 pt-3 pb-2">
          {ETAPES.map((nom, i) => (
            <button
              key={nom}
              type="button"
              disabled={!existant && i > etape}
              onClick={() => setEtape(i)}
              className="flex flex-1 flex-col gap-1.5"
            >
              <span className={`h-1 rounded-full ${i <= etape ? 'bg-accent' : 'bg-bordure'}`} />
              <span className={`text-center text-xs ${i === etape ? 'font-bold text-accent' : 'text-discret'}`}>
                {nom}
              </span>
            </button>
          ))}
        </div>
      </div>

      <Contenu large>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex flex-col gap-5">
            {section(
              0,
              <>
                <Champ
                  libelle="Motif"
                  aide={
                    travail
                      ? 'Voyage seul, liste recentrée sur l’utile : ordinateur, tenue de travail, pas de loisirs.'
                      : undefined
                  }
                >
                  <ChoixUnique options={MOTIFS} valeur={motifDe(p)} onChange={changerMotif} />
                </Champ>
                <Champ libelle="Nom du voyage">
                  <input
                    className={classeSaisie}
                    value={p.nom}
                    onChange={(e) => maj('nom', e.target.value)}
                    placeholder={travail ? 'Ex. : Valence, salon pro' : 'Ex. : Biarritz juillet'}
                    autoFocus={!existant}
                  />
                </Champ>
                <Champ libelle="Type de destination" aide="Plusieurs choix possibles.">
                  <ChoixPuces options={DESTINATIONS} valeur={p.destinations} onChange={(v) => maj('destinations', v)} />
                </Champ>
                <Champ libelle="Climat attendu">
                  <ChoixUnique options={CLIMATS} valeur={p.climat} onChange={(v) => maj('climat', v)} />
                </Champ>
                <Champ
                  libelle="Pays"
                  aide="Hors de France : papiers, carte européenne d'assurance maladie, adaptateur…"
                >
                  <ChoixUnique options={ZONES} valeur={p.zone} onChange={(v) => maj('zone', v)} />
                </Champ>
              </>,
            )}

            {section(
              1,
              <div className="grid gap-5 sm:grid-cols-2">
                <Champ libelle="Départ">
                  <input
                    type="date"
                    className={classeSaisie}
                    value={p.depart}
                    onChange={(e) => maj('depart', e.target.value)}
                  />
                </Champ>
                <Champ libelle="Durée">
                  <Compteur
                    valeur={p.nuits}
                    onChange={(n) => maj('nuits', n)}
                    suffixe={p.nuits > 1 ? 'nuits' : 'nuit'}
                  />
                </Champ>
                {dateValide(p.depart) && (
                  <p className="text-sm text-discret sm:col-span-2">
                    Retour le {dateLongue(plusJours(p.depart, p.nuits))}
                  </p>
                )}
              </div>,
            )}

            {section(
              2,
              <div className="grid gap-2 sm:grid-cols-2">
                {travail && (
                  <p className="text-sm text-discret sm:col-span-2">Voyage de travail : une seule personne part.</p>
                )}
                {profils.map((x) => {
                  const actif = p.participants.includes(x.id);
                  return (
                    <button
                      key={x.id}
                      type="button"
                      aria-pressed={actif}
                      onClick={() =>
                        maj(
                          'participants',
                          travail
                            ? [x.id]
                            : actif
                              ? p.participants.filter((i) => i !== x.id)
                              : [...p.participants, x.id],
                        )
                      }
                      className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                        actif ? 'border-accent bg-accent-clair' : 'border-bordure bg-carte'
                      }`}
                    >
                      <Avatar prenom={x.prenom} couleur={couleurProfil(x, profils)} />
                      <span className="flex-1 font-semibold">{x.prenom}</span>
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                          actif ? 'border-accent bg-accent text-accent-texte' : 'border-discret'
                        }`}
                      >
                        {actif && <Check size={14} strokeWidth={4} />}
                      </span>
                    </button>
                  );
                })}
              </div>,
            )}

            {section(
              3,
              <>
                <Champ libelle="Transport">
                  <ChoixPuces options={TRANSPORTS} valeur={p.transports} onChange={(v) => maj('transports', v)} />
                </Champ>
                <Champ libelle="Hébergement">
                  <ChoixUnique options={HEBERGEMENTS} valeur={p.hebergement} onChange={(v) => maj('hebergement', v)} />
                </Champ>
                <Interrupteur
                  libelle="Machine à laver sur place"
                  aide="Limite les vêtements à 7 jours."
                  valeur={p.machineALaver}
                  onChange={(v) => maj('machineALaver', v)}
                />
                <Champ libelle="Activités prévues">
                  <ChoixPuces options={activitesProposees} valeur={p.activites} onChange={(v) => maj('activites', v)} />
                </Champ>
              </>,
            )}

            {etape === 4 && <Carte className="lg:hidden">{resume}</Carte>}

            {etape < 4 && (
              <div className="flex gap-3 lg:hidden">
                {etape > 0 && (
                  <Bouton variante="contour" className="flex-1" onClick={() => setEtape(etape - 1)}>
                    Précédent
                  </Bouton>
                )}
                <Bouton className="flex-[2]" desactive={!etapeValide[etape]} onClick={() => setEtape(etape + 1)}>
                  Suivant
                </Bouton>
              </div>
            )}
          </div>

          <aside className="sticky top-20 hidden lg:block">
            <Carte>{resume}</Carte>
          </aside>
        </div>
      </Contenu>
    </>
  );
}
