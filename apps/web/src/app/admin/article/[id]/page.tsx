'use client';

import { CATEGORIES, Categorie, decrireQuand, decrireQuantite, decrireType, TYPES_ARTICLE } from '@maillot/domain';
import { Archive, ArchiveRestore, Save } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { EditeurConditions } from '@/components/admin/EditeurConditions';
import { EditeurQuantite } from '@/components/admin/EditeurQuantite';
import { Historique } from '@/components/admin/Historique';
import { ReserveEquipe } from '@/components/admin/ReserveEquipe';
import { Simulateur } from '@/components/admin/Simulateur';
import { Contenu, EnTete } from '@/components/Coque';
import { Bouton, Champ, ChoixUnique, classeSaisie, Interrupteur } from '@/components/ui';
import { adminApi, ArticleAdmin, Brouillon, dateHeure, PORTEES, preparer, voyagesMisAJour } from '@/lib/admin';
import { useStore } from '@/store/store';

const NOUVEAU: Brouillon = { nom: '', categorie: 'vetements', portee: 'personne' };

/** Message à afficher après la redirection qui suit une création (la page est remontée). */
let annonce: string | undefined;

const versBrouillon = ({ id: _id, archive: _a, majLe: _m, majPar: _p, ...b }: ArticleAdmin): Brouillon => {
  void [_id, _a, _m, _p];
  return b;
};

export default function FicheArticle() {
  return (
    <ReserveEquipe>
      <Fiche />
    </ReserveEquipe>
  );
}

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-bordure bg-carte p-4 sm:p-5">
      <h2 className="text-lg font-bold">{titre}</h2>
      {children}
    </section>
  );
}

function Fiche() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  // Recharge catalogue et voyages : les voyages à venir viennent d'être mis à jour par le serveur.
  const recharger = useStore((s) => s.charger);
  const creation = id === 'nouveau';

  const [articles, setArticles] = useState<ArticleAdmin[]>();
  const [original, setOriginal] = useState<ArticleAdmin>();
  const [brouillon, setBrouillon] = useState<Brouillon>(NOUVEAU);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'erreur'; texte: string } | undefined>(() => {
    const texte = annonce;
    annonce = undefined;
    return texte ? { type: 'ok', texte } : undefined;
  });

  useEffect(() => {
    adminApi
      .lister()
      .then((liste) => {
        setArticles(liste);
        const a = liste.find((x) => x.id === id);
        if (a) {
          setOriginal(a);
          setBrouillon(versBrouillon(a));
        }
      })
      .catch((e: Error) => setMessage({ type: 'erreur', texte: e.message }));
  }, [id]);

  const pret = useMemo(() => preparer(brouillon), [brouillon]);
  const modifie = creation || !original || JSON.stringify(pret) !== JSON.stringify(preparer(versBrouillon(original)));
  const homonyme =
    pret.nom && articles?.find((a) => a.id !== id && a.nom.toLowerCase() === pret.nom.toLowerCase() && !a.archive);

  const maj = (patch: Partial<Brouillon>) => {
    setMessage(undefined);
    setBrouillon((b) => {
      const n = { ...b, ...patch };
      for (const k of Object.keys(patch) as (keyof Brouillon)[]) if (patch[k] === undefined) delete n[k];
      return n;
    });
  };

  const executer = async (action: () => Promise<ArticleAdmin>, succes: string) => {
    setEnvoi(true);
    try {
      const a = await action();
      setOriginal(a);
      setBrouillon(versBrouillon(a));
      setArticles((liste) => [...(liste ?? []).filter((x) => x.id !== a.id), a]);
      const texte = `${succes} ${voyagesMisAJour(a.voyagesMisAJour)}`;
      setMessage({ type: 'ok', texte });
      void recharger();
      if (creation) {
        annonce = texte;
        router.replace(`/admin/article/${a.id}`);
      }
    } catch (e) {
      setMessage({ type: 'erreur', texte: e instanceof Error ? e.message : 'Erreur' });
    } finally {
      setEnvoi(false);
    }
  };

  const enregistrer = () =>
    executer(
      () => (creation ? adminApi.creer(pret) : adminApi.modifier(id, pret)),
      creation ? 'Article créé.' : 'Enregistré.',
    );

  if (!creation && articles && !original) {
    return (
      <>
        <EnTete titre="Article introuvable" retour="/admin" />
        <Contenu>
          <p className="text-discret">Cet article n’existe pas dans le catalogue.</p>
        </Contenu>
      </>
    );
  }
  if (!creation && !original) {
    return (
      <>
        <EnTete titre="Article" retour="/admin" />
        <Contenu>
          <p className="text-discret">{message?.texte ?? 'Chargement…'}</p>
        </Contenu>
      </>
    );
  }

  return (
    <>
      <EnTete
        titre={creation ? 'Nouvel article' : original!.nom}
        retour="/admin"
        sousTitre={
          original &&
          `${original.archive ? 'Archivé · ' : ''}${original.id} · modifié le ${dateHeure(original.majLe)}${
            original.majPar ? ` par ${original.majPar}` : ''
          }`
        }
      />
      <Contenu large>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
          <div className="flex flex-col gap-5">
            <Section titre="Article">
              <Champ libelle="Nom">
                <input
                  className={classeSaisie}
                  value={brouillon.nom}
                  maxLength={200}
                  onChange={(e) => maj({ nom: e.target.value })}
                  placeholder="Ex. : Crème après-soleil"
                />
                {homonyme && <span className="text-sm text-soleil">Un article en service porte déjà ce nom.</span>}
              </Champ>
              <Champ libelle="Catégorie">
                <select
                  className={classeSaisie}
                  value={brouillon.categorie}
                  onChange={(e) => maj({ categorie: e.target.value as Categorie })}
                >
                  {(Object.keys(CATEGORIES) as Categorie[]).map((c) => (
                    <option key={c} value={c}>
                      {CATEGORIES[c]}
                    </option>
                  ))}
                </select>
              </Champ>
              <Champ
                libelle="Pour qui"
                aide="Commun : une seule ligne pour le groupe, si au moins un voyageur est concerné."
              >
                <ChoixUnique options={PORTEES} valeur={brouillon.portee} onChange={(portee) => maj({ portee })} />
              </Champ>
              <Champ libelle="Type">
                <ChoixUnique
                  options={TYPES_ARTICLE}
                  valeur={brouillon.mode ?? 'liste'}
                  onChange={(m) => maj({ mode: m === 'liste' ? undefined : m })}
                />
              </Champ>
              {brouillon.mode !== 'voiture' && (
                <Interrupteur
                  libelle="🛒 Achetable sur place"
                  aide="En avion ou en train, va dans la liste de courses au lieu de la valise."
                  valeur={!!brouillon.achetable}
                  onChange={(achetable) => maj({ achetable: achetable || undefined })}
                />
              )}
            </Section>

            <Section titre="Quand l’article apparaît">
              <EditeurConditions valeur={brouillon.si} onChange={(si) => maj({ si })} />
            </Section>

            <Section titre="Quantité">
              <EditeurQuantite valeur={brouillon.quantite} onChange={(quantite) => maj({ quantite })} />
            </Section>

            {original && (
              <Section titre="Historique">
                <Historique articles={articles ?? []} articleId={original.id} rafraichir={original.majLe} />
              </Section>
            )}
          </div>

          <aside className="flex flex-col gap-5 lg:sticky lg:top-20">
            <Section titre="Aperçu">
              <dl className="flex flex-col gap-2 text-sm">
                <div>
                  <dt className="text-discret">Pour</dt>
                  <dd>{PORTEES[pret.portee]}</dd>
                </div>
                <div>
                  <dt className="text-discret">Quand</dt>
                  <dd className="font-medium">{decrireQuand(pret)}</dd>
                </div>
                <div>
                  <dt className="text-discret">Quantité</dt>
                  <dd>{decrireQuantite(pret.quantite)}</dd>
                </div>
                <div>
                  <dt className="text-discret">Type</dt>
                  <dd>{decrireType(pret)}</dd>
                </div>
              </dl>
              {message && (
                <p role="status" className={`text-sm ${message.type === 'ok' ? 'text-succes' : 'text-danger'}`}>
                  {message.texte}
                </p>
              )}
              <Bouton onClick={() => void enregistrer()} desactive={envoi || !pret.nom || !modifie}>
                <Save size={18} /> {creation ? 'Créer l’article' : 'Enregistrer'}
              </Bouton>
              {original &&
                (original.archive ? (
                  <Bouton
                    variante="contour"
                    desactive={envoi}
                    onClick={() => void executer(() => adminApi.restaurer(original.id), 'Article remis en service.')}
                  >
                    <ArchiveRestore size={18} /> Remettre en service
                  </Bouton>
                ) : (
                  <Bouton
                    variante="danger"
                    desactive={envoi}
                    onClick={() => {
                      if (confirm(`Archiver « ${original.nom} » ? Il n’apparaîtra plus dans les listes (restaurable).`))
                        void executer(() => adminApi.archiver(original.id), 'Article archivé.');
                    }}
                  >
                    <Archive size={18} /> Archiver
                  </Bouton>
                ))}
            </Section>

            <Section titre="Simulation">
              <Simulateur article={pret} />
            </Section>
          </aside>
        </div>
      </Contenu>
    </>
  );
}
