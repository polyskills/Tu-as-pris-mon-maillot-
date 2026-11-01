'use client';

import {
  ArticleVoyage,
  Categorie,
  CATEGORIES,
  COMMUN,
  genererSuggestions,
  Liste,
  progression,
  responsable,
  Statut,
} from '@maillot/domain';
import {
  Car,
  Check,
  ChevronDown,
  ChevronRight,
  Handshake,
  Lightbulb,
  Luggage,
  MoreHorizontal,
  Plus,
  ShoppingCart,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { Contenu, EnTete } from '@/components/Coque';
import {
  Avatar,
  BarreProgression,
  Bouton,
  ChoixUnique,
  classeSaisie,
  Compteur,
  couleurProfil,
  Feuille,
  Puce,
} from '@/components/ui';
import { useStore } from '@/store/store';

const TOUT = 'tout';
const COURSES = 'courses';
const VOITURE = 'voiture';
/** Onglets qui ne sont pas une personne : leur icône et leur nom. */
const SPECIAUX: Record<string, [ReactNode, string]> = {
  [TOUT]: [<Luggage key="t" size={20} />, 'Tout'],
  [COMMUN]: [<Handshake key="c" size={20} />, 'Commun'],
  [COURSES]: [<ShoppingCart key="s" size={20} />, 'Courses'],
  [VOITURE]: [<Car key="v" size={20} />, 'Voiture'],
};
/** Ce que veut dire « coché » selon la liste. */
const FAIT: Record<Liste, string> = { valise: 'dans la valise', courses: 'acheté', voiture: 'vérifié' };
const ORDRE_CATEGORIES = Object.keys(CATEGORIES) as Categorie[];
const ORDRE_STATUT: Record<Statut, number> = { 'a-prendre': 0, 'dans-valise': 1, 'pas-besoin': 2 };
const emoji = (c: Categorie) => CATEGORIES[c].split(' ')[0];
const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const vibrer = () => navigator.vibrate?.(15);

const trier = (articles: ArticleVoyage[]) =>
  [...articles].sort(
    (a, b) =>
      ORDRE_STATUT[a.statut] - ORDRE_STATUT[b.statut] ||
      ORDRE_CATEGORIES.indexOf(a.categorie) - ORDRE_CATEGORIES.indexOf(b.categorie),
  );

interface Section {
  cle: string;
  titre: string;
  sousTitre?: string;
  couleur?: string;
  articles: ArticleVoyage[];
}

/** Nom court d'un compte (partie de l'adresse avant @) : qui a coché un article dans une famille partagée. */
const pseudo = (email: string) => email.split('@')[0];

export default function Valise() {
  const { id } = useParams<{ id: string }>();
  const voyage = useStore((s) => s.voyages.find((v) => v.id === id));
  const profils = useStore((s) => s.profils);
  const catalogue = useStore((s) => s.catalogue);
  const changerStatut = useStore((s) => s.changerStatut);
  const moi = useStore((s) => s.email);
  const changerQuantite = useStore((s) => s.changerQuantite);
  const changerListe = useStore((s) => s.changerListe);
  const ajouterSuggestion = useStore((s) => s.ajouterSuggestion);
  const supprimerArticle = useStore((s) => s.supprimerArticle);

  const [onglet, setOnglet] = useState<string>(TOUT);
  const [masquerFaits, setMasquerFaits] = useState(false);
  // Sections ouvertes ou fermées à la main. Sinon : une section terminée se replie.
  const [replis, setReplis] = useState<Record<string, boolean>>({});
  const [suggestionsOuvertes, setSuggestionsOuvertes] = useState(false);
  const [options, setOptions] = useState<string | null>(null);
  const [ajoutOuvert, setAjoutOuvert] = useState(false);
  const [annulation, setAnnulation] = useState<ArticleVoyage | null>(null);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (minuteur.current) clearTimeout(minuteur.current);
    },
    [],
  );

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

  const articles = voyage.articles;
  const nomDe = (pid: string) => (pid === COMMUN ? 'Commun' : (profils.find((p) => p.id === pid)?.prenom ?? '?'));
  const couleurDe = (pid: string) => {
    const p = profils.find((x) => x.id === pid);
    return p ? couleurProfil(p, profils) : 'var(--discret)';
  };

  const dansListe = (liste: Liste) => articles.filter((a) => a.liste === liste);
  const valise = dansListe('valise');
  const courses = dansListe('courses');
  const checklist = dansListe('voiture');
  const global = progression(valise);
  const proprietaires = [...voyage.participants, COMMUN];
  const duProprietaire = (pid: string) => valise.filter((a) => a.proprietaire === pid);
  const onglets = [
    TOUT,
    ...proprietaires,
    ...(courses.length ? [COURSES] : []),
    ...(checklist.length ? [VOITURE] : []),
  ];
  // Un onglet Courses ou Voiture vidé disparaît : on revient sur « Tout ».
  const ongletActif = onglets.includes(onglet) ? onglet : TOUT;
  const articlesDe = (o: string) =>
    o === TOUT ? valise : o === COURSES ? courses : o === VOITURE ? checklist : duProprietaire(o);
  const parCategorie = (liste: ArticleVoyage[], avecResponsable: boolean): Section[] =>
    ORDRE_CATEGORIES.map((cat) => {
      const resp = avecResponsable ? responsable(cat, profils, voyage.participants) : undefined;
      return {
        cle: cat,
        titre: CATEGORIES[cat],
        sousTitre: resp ? `gérés par ${resp.prenom}` : undefined,
        articles: liste.filter((a) => a.categorie === cat),
      };
    });

  // Sections : par personne dans « Tout », une seule pour la voiture, par catégorie sinon.
  const sections: Section[] = (
    ongletActif === TOUT
      ? proprietaires.map((pid) => ({
          cle: pid,
          titre: nomDe(pid),
          couleur: pid === COMMUN ? undefined : couleurDe(pid),
          articles: duProprietaire(pid),
        }))
      : ongletActif === VOITURE
        ? [{ cle: VOITURE, titre: '🚗 Avant de partir', articles: checklist }]
        : parCategorie(articlesDe(ongletActif), ongletActif === COMMUN)
  ).filter((s) => s.articles.length > 0);

  // Suggestions de l'onglet courant (aucune pour les courses et la voiture).
  const suggestions =
    ongletActif === COURSES || ongletActif === VOITURE
      ? []
      : genererSuggestions(voyage, profils, catalogue, articles).filter(
          (a) => ongletActif === TOUT || a.proprietaire === ongletActif,
        );
  const afficherProprietaire = ongletActif === TOUT || ongletActif === COURSES;

  const pointer = (a: ArticleVoyage, statut: Statut) => {
    changerStatut(voyage.id, a.id, statut);
    if (statut === 'dans-valise') vibrer();
    if (minuteur.current) clearTimeout(minuteur.current);
    setAnnulation(a);
    minuteur.current = setTimeout(() => setAnnulation(null), 4000);
  };

  const annuler = () => {
    if (!annulation) return;
    changerStatut(voyage.id, annulation.id, annulation.statut);
    setAnnulation(null);
  };

  const libelleAnnulation = (a: ArticleVoyage) => {
    const actuel = articles.find((x) => x.id === a.id)?.statut;
    const verbe = actuel === 'dans-valise' ? FAIT[a.liste] : actuel === 'pas-besoin' ? 'pas besoin' : 'à prendre';
    return `« ${a.nom} » ${verbe}`;
  };

  const choisi = options ? articles.find((a) => a.id === options) : undefined;

  const ongletBouton = (o: string, vertical: boolean) => {
    const p = progression(articlesDe(o));
    const actif = ongletActif === o;
    const special = SPECIAUX[o];
    const icone = special ? (
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
          actif ? 'bg-accent text-accent-texte' : 'bg-bordure text-texte'
        }`}
      >
        {special[0]}
      </span>
    ) : (
      <Avatar prenom={nomDe(o)} couleur={couleurDe(o)} taille={40} fini={p.total > 0 && p.restants === 0} />
    );
    const restants = p.restants === 0 ? 'fini' : `${p.restants} restant${p.restants > 1 ? 's' : ''}`;
    return vertical ? (
      <button
        key={o}
        type="button"
        onClick={() => setOnglet(o)}
        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${
          actif ? 'bg-accent-clair' : 'hover:bg-bordure/50'
        }`}
      >
        {icone}
        <span className="min-w-0 flex-1">
          <span className={`block truncate font-semibold ${actif ? 'text-accent' : ''}`}>
            {special ? special[1] : nomDe(o)}
          </span>
          <span className="block text-xs text-discret">{restants}</span>
          <span className="mt-1 block">
            <BarreProgression faits={p.faits} total={p.total} fine />
          </span>
        </span>
      </button>
    ) : (
      <button
        key={o}
        type="button"
        onClick={() => setOnglet(o)}
        className={`flex min-w-20 flex-col items-center gap-1 rounded-xl border px-2.5 py-2 ${
          actif ? 'border-accent bg-accent-clair' : 'border-transparent'
        }`}
      >
        {icone}
        <span className={`max-w-20 truncate text-sm font-semibold ${actif ? 'text-accent' : ''}`}>
          {special ? special[1] : nomDe(o)}
        </span>
        <span className="text-xs text-discret">{restants}</span>
      </button>
    );
  };

  return (
    <>
      <EnTete
        titre={voyage.nom}
        retour="/"
        actions={
          <Link
            href={`/voyage/${voyage.id}/modifier`}
            className="rounded-lg px-3 py-1.5 font-semibold text-accent hover:bg-accent-clair"
          >
            Modifier
          </Link>
        }
      />

      <div className="mx-auto w-full max-w-6xl px-4 py-4 md:px-8 md:py-6 lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-6">
        <aside className="sticky top-20 hidden self-start lg:flex lg:flex-col lg:gap-1">
          {onglets.map((o) => ongletBouton(o, true))}
        </aside>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-bordure bg-carte p-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-lg font-bold">
                {global.restants === 0
                  ? '✅ Valise bouclée !'
                  : `Il reste ${global.restants} article${global.restants > 1 ? 's' : ''}`}
              </p>
              <span className="text-sm text-discret">
                {global.faits}/{global.total}
              </span>
            </div>
            <BarreProgression faits={global.faits} total={global.total} />
            <div className="-mx-1 flex gap-1 overflow-x-auto pb-1 lg:hidden">
              {onglets.map((o) => ongletBouton(o, false))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Puce
                libelle={masquerFaits ? '✓ Masquer ce qui est fait' : 'Masquer ce qui est fait'}
                actif={masquerFaits}
                onClick={() => setMasquerFaits(!masquerFaits)}
              />
              <div className="hidden md:block">
                <Bouton variante="contour" className="py-2" onClick={() => setAjoutOuvert(true)}>
                  <Plus size={18} /> Ajouter un article
                </Bouton>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-bordure bg-carte">
            {sections.length === 0 && <p className="p-8 text-center text-discret">Rien à afficher ici 👌</p>}
            {sections.map((section, index) => {
              const p = progression(section.articles);
              const cleRepli = `${ongletActif}/${section.cle}`;
              const replie = replis[cleRepli] ?? (p.total > 0 && p.restants === 0);
              const visibles = trier(section.articles).filter((a) => !masquerFaits || a.statut === 'a-prendre');
              const fini = p.total > 0 && p.restants === 0;
              return (
                <section key={section.cle} className="border-b border-bordure last:rounded-b-2xl last:border-b-0">
                  <button
                    type="button"
                    onClick={() => setReplis({ ...replis, [cleRepli]: !replie })}
                    className={`sticky top-[57px] z-10 flex w-full items-center gap-3 border-b border-bordure bg-fond px-4 py-3 text-left ${
                      index === 0 ? 'rounded-t-2xl' : ''
                    }`}
                  >
                    {section.couleur && <Avatar prenom={section.titre} couleur={section.couleur} taille={26} />}
                    <span className="flex-1">
                      <span className="block font-bold">{section.titre}</span>
                      {section.sousTitre && <span className="block text-sm text-discret">{section.sousTitre}</span>}
                    </span>
                    <span className={`text-sm ${fini ? 'font-bold text-succes' : 'text-discret'}`}>
                      {fini ? '✓ ' : ''}
                      {p.faits}/{p.total}
                    </span>
                    {replie ? (
                      <ChevronRight size={18} className="text-discret" />
                    ) : (
                      <ChevronDown size={18} className="text-discret" />
                    )}
                  </button>
                  {!replie &&
                    visibles.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center gap-3 border-b border-bordure/70 px-4 last:border-b-0"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            a.statut === 'pas-besoin'
                              ? setOptions(a.id)
                              : pointer(a, a.statut === 'dans-valise' ? 'a-prendre' : 'dans-valise')
                          }
                          className="flex min-w-0 flex-1 items-center gap-3 py-3 text-left"
                        >
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 ${
                              a.statut === 'dans-valise'
                                ? 'border-succes bg-succes text-white'
                                : a.statut === 'pas-besoin'
                                  ? 'border-bordure bg-bordure text-discret'
                                  : 'border-discret'
                            }`}
                          >
                            {a.statut === 'dans-valise' && <Check size={16} strokeWidth={4} />}
                            {a.statut === 'pas-besoin' && '–'}
                          </span>
                          {ongletActif === TOUT && <span>{emoji(a.categorie)}</span>}
                          <span className="min-w-0 flex-1">
                            <span className={`block ${a.statut !== 'a-prendre' ? 'text-discret line-through' : ''}`}>
                              {a.nom}
                            </span>
                            {ongletActif === COURSES && (
                              <span className="block text-sm text-discret">{nomDe(a.proprietaire)}</span>
                            )}
                            {a.statut !== 'a-prendre' && a.pointePar && a.pointePar !== moi && (
                              <span className="block text-xs text-discret">
                                {a.statut === 'dans-valise' ? 'Mis' : 'Écarté'} par {pseudo(a.pointePar)}
                              </span>
                            )}
                          </span>
                          {a.quantite > 1 && (
                            <span className="rounded-lg bg-soleil-clair px-2 py-0.5 text-sm font-bold">
                              ×{a.quantite}
                            </span>
                          )}
                        </button>
                        <button
                          type="button"
                          aria-label={`Options de ${a.nom}`}
                          onClick={() => setOptions(a.id)}
                          className="rounded-full p-1.5 text-discret hover:bg-bordure/60"
                        >
                          <MoreHorizontal size={20} />
                        </button>
                      </div>
                    ))}
                </section>
              );
            })}
          </div>

          {suggestions.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-bordure bg-carte">
              <button
                type="button"
                onClick={() => setSuggestionsOuvertes(!suggestionsOuvertes)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <Lightbulb size={20} className="text-soleil" />
                <span className="flex-1">
                  <span className="block font-bold">Suggestions</span>
                  <span className="block text-sm text-discret">
                    Pas mis d’office : ajoute ce qui te sert d’un clic.
                  </span>
                </span>
                <span className="text-sm text-discret">{suggestions.length}</span>
                {suggestionsOuvertes ? (
                  <ChevronDown size={18} className="text-discret" />
                ) : (
                  <ChevronRight size={18} className="text-discret" />
                )}
              </button>
              {suggestionsOuvertes && (
                <div className="grid border-t border-bordure sm:grid-cols-2">
                  {suggestions.map((sug) => (
                    <div key={sug.id} className="flex items-center gap-3 border-b border-bordure/70 px-4 py-2.5">
                      <span>{emoji(sug.categorie)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block">{sug.nom}</span>
                        {afficherProprietaire && (
                          <span className="block text-sm text-discret">{nomDe(sug.proprietaire)}</span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          ajouterSuggestion(voyage.id, sug);
                          vibrer();
                        }}
                        className="shrink-0 rounded-full border border-accent px-3 py-1 text-sm font-semibold text-accent hover:bg-accent-clair"
                      >
                        + Ajouter
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {annulation ? (
        <div className="fixed inset-x-4 bottom-24 z-40 mx-auto flex max-w-md items-center gap-3 rounded-xl bg-texte px-4 py-3.5 text-fond shadow-lg md:bottom-6">
          <span className="min-w-0 flex-1 truncate">{libelleAnnulation(annulation)}</span>
          <button type="button" onClick={annuler} className="font-bold text-soleil">
            Annuler
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAjoutOuvert(true)}
          className="fixed right-5 bottom-24 z-40 flex items-center gap-2 rounded-full bg-accent px-5 py-3.5 font-bold text-accent-texte shadow-lg md:hidden"
        >
          <Plus size={20} /> Ajouter
        </button>
      )}

      {choisi && (
        <Feuille titre={choisi.nom} fermer={() => setOptions(null)}>
          <p className="-mt-2 text-sm text-discret">
            {CATEGORIES[choisi.categorie]} · {nomDe(choisi.proprietaire)}
          </p>
          <div className="flex items-center justify-between py-2">
            <span className="font-semibold">Quantité</span>
            <Compteur valeur={choisi.quantite} min={1} onChange={(q) => changerQuantite(voyage.id, choisi.id, q)} />
          </div>
          <Bouton
            onClick={() => {
              pointer(choisi, 'dans-valise');
              setOptions(null);
            }}
          >
            ✓ {majuscule(FAIT[choisi.liste])}
          </Bouton>
          <Bouton
            variante="contour"
            onClick={() => {
              pointer(choisi, 'a-prendre');
              setOptions(null);
            }}
          >
            {choisi.liste === 'courses' ? 'À acheter' : choisi.liste === 'voiture' ? 'À vérifier' : 'À prendre'}
          </Bouton>
          <Bouton
            variante="contour"
            onClick={() => {
              pointer(choisi, 'pas-besoin');
              setOptions(null);
            }}
          >
            Pas besoin cette fois
          </Bouton>
          {choisi.liste !== 'voiture' && (
            <Bouton
              variante="contour"
              onClick={() => {
                changerListe(voyage.id, choisi.id, choisi.liste === 'valise' ? 'courses' : 'valise');
                setOptions(null);
              }}
            >
              {choisi.liste === 'valise' ? '🛒 J’achète sur place' : '🧳 Je l’emporte'}
            </Bouton>
          )}
          {(choisi.origine === 'ajout' || choisi.origine === 'suggestion') && (
            <Bouton
              variante="danger"
              onClick={() => {
                supprimerArticle(voyage.id, choisi.id);
                setOptions(null);
              }}
            >
              Supprimer l’article
            </Bouton>
          )}
        </Feuille>
      )}

      {ajoutOuvert && (
        <FeuilleAjout
          fermer={() => setAjoutOuvert(false)}
          voyageId={voyage.id}
          proprietaires={Object.fromEntries(proprietaires.map((p) => [p, nomDe(p)]))}
          proprietaireParDefaut={SPECIAUX[ongletActif] ? COMMUN : ongletActif}
          liste={ongletActif === COURSES ? 'courses' : ongletActif === VOITURE ? 'voiture' : 'valise'}
        />
      )}
    </>
  );
}

function FeuilleAjout({
  fermer,
  voyageId,
  proprietaires,
  proprietaireParDefaut,
  liste,
}: {
  fermer: () => void;
  voyageId: string;
  proprietaires: Record<string, string>;
  proprietaireParDefaut: string;
  liste: Liste;
}) {
  const ajouterArticle = useStore((st) => st.ajouterArticle);
  const [nom, setNom] = useState('');
  const [categorie, setCategorie] = useState<Categorie>('loisirs');
  const [proprietaire, setProprietaire] = useState(proprietaireParDefaut);

  const valider = () => {
    if (!nom.trim()) return;
    ajouterArticle(voyageId, nom.trim(), categorie, proprietaire, liste);
    fermer();
  };

  return (
    <Feuille
      titre={
        liste === 'courses'
          ? 'Ajouter aux courses'
          : liste === 'voiture'
            ? 'Ajouter à la check-list'
            : 'Ajouter un article'
      }
      fermer={fermer}
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          valider();
        }}
      >
        <input
          className={classeSaisie}
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder="Ex. : cerf-volant"
          autoFocus
        />
        <div className="flex flex-col gap-2">
          <span className="font-semibold">Pour qui ?</span>
          <ChoixUnique options={proprietaires} valeur={proprietaire} onChange={setProprietaire} />
        </div>
        <div className="flex flex-col gap-2">
          <span className="font-semibold">Catégorie</span>
          <ChoixUnique options={CATEGORIES} valeur={categorie} onChange={setCategorie} />
        </div>
        <Bouton type="submit" desactive={!nom.trim()}>
          Ajouter
        </Bouton>
      </form>
    </Feuille>
  );
}
