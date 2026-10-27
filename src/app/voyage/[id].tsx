import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { LayoutAnimation, Modal, Pressable, ScrollView, SectionList, Text, View } from 'react-native';
import { vibrationLegere, vibrationSucces } from '../../components/retour';
import { creerStyles, useCouleurs } from '../../components/theme';
import {
  Avatar,
  BarreProgression,
  Bouton,
  ChoixUnique,
  Compteur,
  couleurProfil,
  Puce,
  Saisie,
  useStyles,
} from '../../components/ui';
import { CATALOGUE } from '../../domain/catalogue';
import { genererSuggestions, progression, responsable } from '../../domain/generer';
import { CATEGORIES } from '../../domain/libelles';
import { ArticleVoyage, Categorie, COMMUN, Liste, Statut } from '../../domain/types';
import { useStore } from '../../store/store';

const TOUT = 'tout';
const COURSES = 'courses';
const VOITURE = 'voiture';
/** Onglets qui ne sont pas une personne : leur icône et leur nom. */
const SPECIAUX: Record<string, [string, string]> = {
  [TOUT]: ['🧳', 'Tout'],
  [COMMUN]: ['🤝', 'Commun'],
  [COURSES]: ['🛒', 'Courses'],
  [VOITURE]: ['🚗', 'Voiture'],
};
/** Ce que veut dire « coché » selon la liste. */
const FAIT: Record<Liste, string> = { valise: 'dans la valise', courses: 'acheté', voiture: 'vérifié' };
const ORDRE_CATEGORIES = Object.keys(CATEGORIES) as Categorie[];
const ORDRE_STATUT: Record<Statut, number> = { 'a-prendre': 0, 'dans-valise': 1, 'pas-besoin': 2 };
const emoji = (c: Categorie) => CATEGORIES[c].split(' ')[0];

interface Section {
  cle: string;
  titre: string;
  sousTitre?: string;
  couleur?: string;
  faits: number;
  total: number;
  replie: boolean;
  data: ArticleVoyage[];
}

const trier = (articles: ArticleVoyage[]) =>
  [...articles].sort(
    (a, b) =>
      ORDRE_STATUT[a.statut] - ORDRE_STATUT[b.statut] ||
      ORDRE_CATEGORIES.indexOf(a.categorie) - ORDRE_CATEGORIES.indexOf(b.categorie),
  );

export default function Valise() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const voyage = useStore((s) => s.voyages.find((v) => v.id === id));
  const profils = useStore((s) => s.profils);
  const changerStatut = useStore((s) => s.changerStatut);
  const changerQuantite = useStore((s) => s.changerQuantite);
  const changerListe = useStore((s) => s.changerListe);
  const ajouterSuggestion = useStore((s) => s.ajouterSuggestion);
  const supprimerArticle = useStore((s) => s.supprimerArticle);

  const c = useCouleurs();
  const s = useStyles();
  const l = useStylesLocaux();

  const [onglet, setOnglet] = useState<string>(TOUT);
  const [masquerFaits, setMasquerFaits] = useState(false);
  const [suggestionsOuvertes, setSuggestionsOuvertes] = useState(false);
  // Sections ouvertes ou fermées à la main. Sinon : une section terminée se replie.
  const [replis, setReplis] = useState<Record<string, boolean>>({});
  const [options, setOptions] = useState<string | null>(null);
  const [ajoutOuvert, setAjoutOuvert] = useState(false);
  const [annulation, setAnnulation] = useState<{ article: ArticleVoyage } | null>(null);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (minuteur.current) clearTimeout(minuteur.current);
    },
    [],
  );

  if (!voyage) return <Text style={s.vide}>Voyage introuvable.</Text>;

  const articles = voyage.articles;
  const nomDe = (pid: string) => (pid === COMMUN ? 'Commun' : (profils.find((p) => p.id === pid)?.prenom ?? '?'));
  const couleurDe = (pid: string) => {
    const p = profils.find((x) => x.id === pid);
    return p ? couleurProfil(p, profils) : c.discret;
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
  const parCategorie = (liste: ArticleVoyage[], avecResponsable: boolean) =>
    ORDRE_CATEGORIES.map((cat) => {
      const resp = avecResponsable ? responsable(cat, profils, voyage.participants) : undefined;
      return {
        cle: cat,
        titre: CATEGORIES[cat],
        sousTitre: resp ? `gérés par ${resp.prenom}` : undefined,
        data: liste.filter((a) => a.categorie === cat),
      };
    });

  // Sections : par personne dans « Tout », une seule pour la voiture, par catégorie sinon.
  const brutes: Omit<Section, 'faits' | 'total' | 'replie'>[] =
    ongletActif === TOUT
      ? proprietaires.map((pid) => ({
          cle: pid,
          titre: nomDe(pid),
          couleur: pid === COMMUN ? undefined : couleurDe(pid),
          data: duProprietaire(pid),
        }))
      : ongletActif === VOITURE
        ? [{ cle: VOITURE, titre: '🚗 Avant de partir', data: checklist }]
        : parCategorie(articlesDe(ongletActif), ongletActif === COMMUN);

  // Suggestions de l'onglet courant (aucune pour les courses et la voiture).
  const suggestions =
    ongletActif === COURSES || ongletActif === VOITURE
      ? []
      : genererSuggestions(voyage, profils, CATALOGUE, articles).filter(
          (a) => ongletActif === TOUT || a.proprietaire === ongletActif,
        );
  const afficherProprietaire = ongletActif === TOUT || ongletActif === COURSES;

  const sections: Section[] = brutes
    .filter((b) => b.data.length > 0)
    .map((b) => {
      const p = progression(b.data);
      const replie = replis[`${ongletActif}/${b.cle}`] ?? (p.total > 0 && p.restants === 0);
      const visibles = trier(b.data).filter((a) => !masquerFaits || a.statut === 'a-prendre');
      return { ...b, faits: p.faits, total: p.total, replie, data: replie ? [] : visibles };
    });

  const basculerSection = (cle: string, actuellementReplie: boolean) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setReplis({ ...replis, [`${ongletActif}/${cle}`]: !actuellementReplie });
  };

  const pointer = (a: ArticleVoyage, statut: Statut) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    changerStatut(voyage.id, a.id, statut);
    if (statut === 'dans-valise' && a.liste === 'valise') {
      const restants = global.restants - (a.statut === 'a-prendre' ? 1 : 0);
      if (restants === 0) {
        vibrationSucces();
      } else {
        vibrationLegere();
      }
    } else if (statut === 'dans-valise') {
      vibrationLegere();
    }
    if (minuteur.current) clearTimeout(minuteur.current);
    setAnnulation({ article: a });
    minuteur.current = setTimeout(() => setAnnulation(null), 4000);
  };

  const annuler = () => {
    if (!annulation) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    changerStatut(voyage.id, annulation.article.id, annulation.article.statut);
    setAnnulation(null);
  };

  const libelleAnnulation = (a: ArticleVoyage) => {
    const actuel = articles.find((x) => x.id === a.id)?.statut;
    const verbe = actuel === 'dans-valise' ? FAIT[a.liste] : actuel === 'pas-besoin' ? 'pas besoin' : 'à prendre';
    return `« ${a.nom} » ${verbe}`;
  };

  const choisi = options ? articles.find((a) => a.id === options) : undefined;

  return (
    <View style={s.ecran}>
      <Stack.Screen
        options={{
          title: voyage.nom,
          headerRight: () => (
            <Link href={{ pathname: '/voyage/edition', params: { id: voyage.id } }} asChild>
              <Pressable hitSlop={8}>
                <Text style={s.lien}>Modifier</Text>
              </Pressable>
            </Link>
          ),
        }}
      />

      <View style={l.entete}>
        <View style={s.ligneEspacee}>
          <Text style={s.titre}>
            {global.restants === 0
              ? '✅ Valise bouclée !'
              : `Il reste ${global.restants} article${global.restants > 1 ? 's' : ''}`}
          </Text>
          <Text style={s.discret}>
            {global.faits}/{global.total}
          </Text>
        </View>
        <BarreProgression faits={global.faits} total={global.total} />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={l.onglets}>
          {onglets.map((o) => {
            const p = progression(articlesDe(o));
            const actif = ongletActif === o;
            const special = SPECIAUX[o];
            return (
              <Pressable key={o} onPress={() => setOnglet(o)} style={[l.onglet, actif && l.ongletActif]}>
                {special ? (
                  <View style={[l.pastille, { backgroundColor: actif ? c.accent : c.bordure }]}>
                    <Text style={{ fontSize: 18 }}>{special[0]}</Text>
                  </View>
                ) : (
                  <Avatar prenom={nomDe(o)} couleur={couleurDe(o)} taille={40} fini={p.total > 0 && p.restants === 0} />
                )}
                <Text style={[l.ongletNom, actif && { color: c.accent }]} numberOfLines={1}>
                  {special ? special[1] : nomDe(o)}
                </Text>
                <Text style={s.discret}>
                  {p.restants === 0 ? 'fini' : `${p.restants} restant${p.restants > 1 ? 's' : ''}`}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={s.ligne}>
          <Puce
            libelle={masquerFaits ? '✓ Masquer ce qui est fait' : 'Masquer ce qui est fait'}
            actif={masquerFaits}
            onPress={() => setMasquerFaits(!masquerFaits)}
          />
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ paddingBottom: 140 }}
        stickySectionHeadersEnabled
        renderSectionHeader={({ section }) => {
          const replie = section.replie;
          const fini = section.total > 0 && section.faits === section.total;
          return (
            <Pressable style={l.section} onPress={() => basculerSection(section.cle, replie)}>
              {section.couleur && <Avatar prenom={section.titre} couleur={section.couleur} taille={26} />}
              <View style={{ flex: 1 }}>
                <Text style={l.sectionTitre}>{section.titre}</Text>
                {section.sousTitre && <Text style={s.discret}>{section.sousTitre}</Text>}
              </View>
              <Text style={[s.discret, fini && { color: c.succes, fontWeight: '700' }]}>
                {fini ? '✓ ' : ''}
                {section.faits}/{section.total}
              </Text>
              <Text style={l.chevron}>{replie ? '›' : '⌄'}</Text>
            </Pressable>
          );
        }}
        renderItem={({ item: a }) => (
          <Pressable
            onPress={() =>
              a.statut === 'pas-besoin'
                ? setOptions(a.id)
                : pointer(a, a.statut === 'dans-valise' ? 'a-prendre' : 'dans-valise')
            }
            onLongPress={() => setOptions(a.id)}
            style={({ pressed }) => [l.ligne, pressed && { backgroundColor: c.accentClair }]}
          >
            <View
              style={[l.case, a.statut === 'dans-valise' && l.caseCochee, a.statut === 'pas-besoin' && l.caseIgnoree]}
            >
              {a.statut === 'dans-valise' && <Text style={l.coche}>✓</Text>}
              {a.statut === 'pas-besoin' && <Text style={l.tiret}>–</Text>}
            </View>
            {ongletActif === TOUT && <Text style={{ fontSize: 16 }}>{emoji(a.categorie)}</Text>}
            <View style={{ flex: 1 }}>
              <Text style={[s.texte, a.statut !== 'a-prendre' && l.barre]}>{a.nom}</Text>
              {ongletActif === COURSES && <Text style={s.discret}>{nomDe(a.proprietaire)}</Text>}
            </View>
            {a.quantite > 1 && (
              <View style={l.quantite}>
                <Text style={l.quantiteTexte}>×{a.quantite}</Text>
              </View>
            )}
            <Pressable hitSlop={12} onPress={() => setOptions(a.id)}>
              <Text style={l.plus}>⋯</Text>
            </Pressable>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={s.vide}>Rien à afficher ici 👌</Text>}
        ListFooterComponent={
          suggestions.length > 0 ? (
            <View style={{ marginTop: 16 }}>
              <Pressable style={l.section} onPress={() => setSuggestionsOuvertes(!suggestionsOuvertes)}>
                <View style={{ flex: 1 }}>
                  <Text style={l.sectionTitre}>💡 Suggestions</Text>
                  <Text style={s.discret}>Pas mis d’office : ajoute ce qui te sert d’un tap.</Text>
                </View>
                <Text style={s.discret}>{suggestions.length}</Text>
                <Text style={l.chevron}>{suggestionsOuvertes ? '⌄' : '›'}</Text>
              </Pressable>
              {suggestionsOuvertes &&
                suggestions.map((sug) => (
                  <View key={sug.id} style={l.ligne}>
                    <Text style={{ fontSize: 16 }}>{emoji(sug.categorie)}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.texte}>{sug.nom}</Text>
                      {afficherProprietaire && <Text style={s.discret}>{nomDe(sug.proprietaire)}</Text>}
                    </View>
                    <Pressable
                      hitSlop={8}
                      style={l.boutonAjout}
                      onPress={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        ajouterSuggestion(voyage.id, sug);
                        vibrationLegere();
                      }}
                    >
                      <Text style={l.boutonAjoutTexte}>+ Ajouter</Text>
                    </Pressable>
                  </View>
                ))}
            </View>
          ) : undefined
        }
      />

      {annulation ? (
        <View style={l.toast}>
          <Text style={l.toastTexte} numberOfLines={1}>
            {libelleAnnulation(annulation.article)}
          </Text>
          <Pressable onPress={annuler} hitSlop={10}>
            <Text style={l.toastAction}>Annuler</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable style={l.fab} onPress={() => setAjoutOuvert(true)}>
          <Text style={l.fabTexte}>+ Ajouter</Text>
        </Pressable>
      )}

      <FeuilleOptions
        article={choisi}
        nomProprietaire={choisi ? nomDe(choisi.proprietaire) : ''}
        fermer={() => setOptions(null)}
        pointer={(statut) => {
          if (choisi) pointer(choisi, statut);
          setOptions(null);
        }}
        changerQuantite={(q) => choisi && changerQuantite(voyage.id, choisi.id, q)}
        changerListe={(liste) => {
          if (choisi) changerListe(voyage.id, choisi.id, liste);
          setOptions(null);
        }}
        supprimer={() => {
          if (choisi) supprimerArticle(voyage.id, choisi.id);
          setOptions(null);
        }}
      />

      {/* Montée à l'ouverture pour repartir du propriétaire de l'onglet courant. */}
      {ajoutOuvert && (
        <FeuilleAjout
          fermer={() => setAjoutOuvert(false)}
          voyageId={voyage.id}
          proprietaires={Object.fromEntries(proprietaires.map((p) => [p, nomDe(p)]))}
          proprietaireParDefaut={SPECIAUX[ongletActif] ? COMMUN : ongletActif}
          liste={ongletActif === COURSES ? 'courses' : ongletActif === VOITURE ? 'voiture' : 'valise'}
        />
      )}
    </View>
  );
}

function FeuilleOptions({
  article,
  nomProprietaire,
  fermer,
  pointer,
  changerQuantite,
  changerListe,
  supprimer,
}: {
  article?: ArticleVoyage;
  nomProprietaire: string;
  fermer: () => void;
  pointer: (s: Statut) => void;
  changerQuantite: (q: number) => void;
  changerListe: (l: Liste) => void;
  supprimer: () => void;
}) {
  const s = useStyles();
  const l = useStylesLocaux();
  return (
    <Modal visible={!!article} transparent animationType="slide" onRequestClose={fermer}>
      <Pressable style={l.voile} onPress={fermer}>
        {article && (
          <Pressable style={l.feuille}>
            <View style={l.poignee} />
            <Text style={s.titre}>{article.nom}</Text>
            <Text style={s.discret}>
              {CATEGORIES[article.categorie]} · {nomProprietaire}
            </Text>
            <View style={[s.ligneEspacee, { marginVertical: 8 }]}>
              <Text style={s.libelle}>Quantité</Text>
              <Compteur valeur={article.quantite} min={1} onChange={changerQuantite} />
            </View>
            <Bouton
              titre={`✓ ${FAIT[article.liste][0].toUpperCase()}${FAIT[article.liste].slice(1)}`}
              onPress={() => pointer('dans-valise')}
            />
            <Bouton
              titre={
                article.liste === 'courses' ? 'À acheter' : article.liste === 'voiture' ? 'À vérifier' : 'À prendre'
              }
              variante="contour"
              onPress={() => pointer('a-prendre')}
            />
            <Bouton titre="Pas besoin cette fois" variante="contour" onPress={() => pointer('pas-besoin')} />
            {article.liste === 'valise' && (
              <Bouton titre="🛒 J’achète sur place" variante="contour" onPress={() => changerListe('courses')} />
            )}
            {article.liste === 'courses' && (
              <Bouton titre="🧳 Je l’emporte" variante="contour" onPress={() => changerListe('valise')} />
            )}
            {(article.origine === 'ajout' || article.origine === 'suggestion') && (
              <Bouton titre="Supprimer l'article" variante="danger" onPress={supprimer} />
            )}
          </Pressable>
        )}
      </Pressable>
    </Modal>
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
  const s = useStyles();
  const l = useStylesLocaux();
  const ajouterArticle = useStore((st) => st.ajouterArticle);
  const [nom, setNom] = useState('');
  const [categorie, setCategorie] = useState<Categorie>('loisirs');
  const [proprietaire, setProprietaire] = useState(proprietaireParDefaut);

  const valider = () => {
    if (!nom.trim()) return;
    ajouterArticle(voyageId, nom.trim(), categorie, proprietaire, liste);
    setNom('');
    fermer();
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={fermer}>
      <Pressable style={l.voile} onPress={fermer}>
        <Pressable style={l.feuille}>
          <View style={l.poignee} />
          <Text style={s.titre}>
            {liste === 'courses'
              ? 'Ajouter aux courses'
              : liste === 'voiture'
                ? 'Ajouter à la check-list'
                : 'Ajouter un article'}
          </Text>
          <Saisie
            value={nom}
            onChangeText={setNom}
            placeholder="Ex. : cerf-volant"
            autoFocus
            onSubmitEditing={valider}
            returnKeyType="done"
          />
          <Text style={s.libelle}>Pour qui ?</Text>
          <ChoixUnique options={proprietaires} valeur={proprietaire} onChange={setProprietaire} />
          <Text style={s.libelle}>Catégorie</Text>
          <ChoixUnique options={CATEGORIES} valeur={categorie} onChange={setCategorie} />
          <Bouton titre="Ajouter" onPress={valider} desactive={!nom.trim()} style={{ marginTop: 8 }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const useStylesLocaux = creerStyles((c) => ({
  entete: {
    padding: 16,
    paddingBottom: 12,
    gap: 12,
    backgroundColor: c.carte,
    borderBottomWidth: 1,
    borderBottomColor: c.bordure,
  },
  onglets: { gap: 6, paddingVertical: 2 },
  onglet: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    minWidth: 76,
  },
  ongletActif: { borderColor: c.accent, backgroundColor: c.accentClair },
  ongletNom: { fontSize: 14, fontWeight: '600', color: c.texte, maxWidth: 80 },
  pastille: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: c.fond,
    borderBottomWidth: 1,
    borderBottomColor: c.bordure,
  },
  sectionTitre: { fontSize: 16, fontWeight: '700', color: c.texte },
  chevron: { fontSize: 20, color: c.discret, width: 16, textAlign: 'center' },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    backgroundColor: c.carte,
    borderBottomWidth: 1,
    borderBottomColor: c.bordure,
  },
  case: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: c.discret,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caseCochee: { backgroundColor: c.succes, borderColor: c.succes },
  caseIgnoree: { borderColor: c.bordure, backgroundColor: c.bordure },
  coche: { color: '#fff', fontWeight: '800' },
  tiret: { color: c.discret, fontWeight: '800' },
  barre: { textDecorationLine: 'line-through', color: c.discret },
  quantite: { backgroundColor: c.soleilClair, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  quantiteTexte: { color: c.texte, fontWeight: '700', fontSize: 13 },
  plus: { fontSize: 22, color: c.discret, paddingHorizontal: 4 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 32,
    backgroundColor: c.accent,
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  fabTexte: { color: c.accentTexte, fontWeight: '700', fontSize: 16 },
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 32,
    backgroundColor: c.texte,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toastTexte: { color: c.fond, flex: 1, fontSize: 15 },
  toastAction: { color: c.soleil, fontWeight: '700', fontSize: 15 },
  voile: { flex: 1, backgroundColor: c.voile, justifyContent: 'flex-end' },
  feuille: {
    backgroundColor: c.carte,
    padding: 20,
    paddingBottom: 36,
    gap: 10,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  boutonAjout: { borderWidth: 1, borderColor: c.accent, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  boutonAjoutTexte: { color: c.accent, fontWeight: '600', fontSize: 14 },
  poignee: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: c.bordure, marginBottom: 4 },
}));
