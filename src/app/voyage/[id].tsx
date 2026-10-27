import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, SectionList, StyleSheet, Text, View } from 'react-native';
import { BarreProgression, Bouton, Compteur, couleurs, Puce, Saisie, styles } from '../../components/ui';
import { progression, responsable } from '../../domain/generer';
import { CATEGORIES } from '../../domain/libelles';
import { ArticleVoyage, Categorie, COMMUN, Statut } from '../../domain/types';
import { useStore } from '../../store/store';

const TOUT = 'tout';
const ORDRE = Object.keys(CATEGORIES) as Categorie[];

export default function Valise() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const voyage = useStore((s) => s.voyages.find((v) => v.id === id));
  const profils = useStore((s) => s.profils);
  const changerStatut = useStore((s) => s.changerStatut);
  const changerQuantite = useStore((s) => s.changerQuantite);
  const ajouterArticle = useStore((s) => s.ajouterArticle);
  const supprimerArticle = useStore((s) => s.supprimerArticle);

  const [onglet, setOnglet] = useState<string>(TOUT);
  const [resteSeulement, setResteSeulement] = useState(false);
  const [nouveau, setNouveau] = useState('');
  const [selection, setSelection] = useState<ArticleVoyage | null>(null);

  const prenom = (pid: string) => (pid === COMMUN ? 'Commun' : (profils.find((p) => p.id === pid)?.prenom ?? '?'));

  const articles = voyage?.articles ?? [];
  const visibles = articles.filter(
    (a) => (onglet === TOUT || a.proprietaire === onglet) && (!resteSeulement || a.statut === 'a-prendre'),
  );

  const sections = useMemo(
    () =>
      ORDRE.map((categorie) => ({
        categorie,
        data: visibles
          .filter((a) => a.categorie === categorie)
          .sort((a, b) => Number(a.statut === 'pas-besoin') - Number(b.statut === 'pas-besoin')),
      })).filter((s) => s.data.length > 0),
    [visibles],
  );

  if (!voyage) return <Text style={styles.vide}>Voyage introuvable.</Text>;

  const global = progression(articles);
  const local = progression(articles.filter((a) => onglet === TOUT || a.proprietaire === onglet));
  const onglets = [TOUT, ...voyage.participants, COMMUN];

  const basculer = (a: ArticleVoyage) =>
    changerStatut(voyage.id, a.id, a.statut === 'dans-valise' ? 'a-prendre' : 'dans-valise');

  const ajouter = () => {
    const nom = nouveau.trim();
    if (!nom) return;
    ajouterArticle(voyage.id, nom, 'loisirs', onglet === TOUT ? COMMUN : onglet);
    setNouveau('');
  };

  // Article sélectionné, relu dans le store pour refléter les changements en direct.
  const choisi = selection && articles.find((a) => a.id === selection.id);
  const fixerStatut = (statut: Statut) => {
    if (choisi) changerStatut(voyage.id, choisi.id, statut);
    setSelection(null);
  };

  return (
    <View style={styles.ecran}>
      <Stack.Screen
        options={{
          title: voyage.nom,
          headerRight: () => (
            <Link href={{ pathname: '/voyage/edition', params: { id: voyage.id } }} asChild>
              <Pressable hitSlop={8}>
                <Text style={{ color: couleurs.accent, fontSize: 16 }}>Modifier</Text>
              </Pressable>
            </Link>
          ),
        }}
      />

      <View style={local_.entete}>
        <BarreProgression faits={global.faits} total={global.total} />
        <Text style={styles.discret}>
          {global.restants === 0
            ? '✅ Tout est dans la valise, bon voyage !'
            : `${global.faits} / ${global.total} dans la valise · il reste ${global.restants} article${global.restants > 1 ? 's' : ''}`}
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {onglets.map((o) => {
            const nb = progression(articles.filter((a) => o === TOUT || a.proprietaire === o)).restants;
            return (
              <Puce
                key={o}
                libelle={`${o === TOUT ? 'Tout' : prenom(o)}${nb > 0 ? ` · ${nb}` : ' ✓'}`}
                actif={onglet === o}
                onPress={() => setOnglet(o)}
              />
            );
          })}
        </ScrollView>

        <Puce
          libelle={resteSeulement ? '👀 Reste à prendre uniquement' : '👀 Afficher seulement ce qui reste'}
          actif={resteSeulement}
          onPress={() => setResteSeulement(!resteSeulement)}
        />
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        stickySectionHeadersEnabled
        renderSectionHeader={({ section }) => {
          const resp = responsable(section.categorie, profils, voyage.participants);
          return (
            <View style={local_.section}>
              <Text style={local_.sectionTitre}>{CATEGORIES[section.categorie]}</Text>
              {resp && (onglet === TOUT || onglet === COMMUN) && (
                <Text style={styles.discret}>communs gérés par {resp.prenom}</Text>
              )}
            </View>
          );
        }}
        renderItem={({ item: a }) => (
          <Pressable
            onPress={() => (a.statut === 'pas-besoin' ? setSelection(a) : basculer(a))}
            onLongPress={() => setSelection(a)}
            style={({ pressed }) => [local_.ligne, pressed && { backgroundColor: couleurs.accentClair }]}
          >
            <View style={[local_.case, a.statut === 'dans-valise' && local_.caseCochee]}>
              {a.statut === 'dans-valise' && <Text style={local_.coche}>✓</Text>}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.texte, a.statut !== 'a-prendre' && local_.barre]}>
                {a.nom}
                {a.quantite > 1 ? `  ×${a.quantite}` : ''}
              </Text>
              {onglet === TOUT && <Text style={styles.discret}>{prenom(a.proprietaire)}</Text>}
            </View>
            <Pressable hitSlop={10} onPress={() => setSelection(a)}>
              <Text style={local_.plus}>⋯</Text>
            </Pressable>
          </Pressable>
        )}
        ListEmptyComponent={
          <Text style={styles.vide}>{resteSeulement ? 'Rien à prendre ici 👌' : 'Aucun article.'}</Text>
        }
        ListFooterComponent={
          <View style={{ padding: 16, gap: 8 }}>
            <Saisie
              value={nouveau}
              onChangeText={setNouveau}
              placeholder={`Ajouter un article (${onglet === TOUT ? 'commun' : prenom(onglet)})`}
              onSubmitEditing={ajouter}
              returnKeyType="done"
            />
          </View>
        }
      />

      <Modal visible={!!choisi} transparent animationType="slide" onRequestClose={() => setSelection(null)}>
        <Pressable style={local_.voile} onPress={() => setSelection(null)}>
          {choisi && (
            <Pressable style={local_.feuille}>
              <Text style={styles.titre}>{choisi.nom}</Text>
              <Text style={styles.discret}>{prenom(choisi.proprietaire)}</Text>
              <Text style={styles.libelle}>Quantité</Text>
              <Compteur valeur={choisi.quantite} min={1} onChange={(q) => changerQuantite(voyage.id, choisi.id, q)} />
              <Bouton titre="✓ Dans la valise" onPress={() => fixerStatut('dans-valise')} />
              <Bouton titre="À prendre" variante="contour" onPress={() => fixerStatut('a-prendre')} />
              <Bouton titre="Pas besoin cette fois" variante="contour" onPress={() => fixerStatut('pas-besoin')} />
              {choisi.origine === 'ajout' && (
                <Bouton
                  titre="Supprimer"
                  variante="danger"
                  onPress={() => {
                    supprimerArticle(voyage.id, choisi.id);
                    setSelection(null);
                  }}
                />
              )}
            </Pressable>
          )}
        </Pressable>
      </Modal>
    </View>
  );
}

const local_ = StyleSheet.create({
  entete: {
    padding: 16,
    gap: 10,
    backgroundColor: couleurs.carte,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
  },
  section: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6, backgroundColor: couleurs.fond },
  sectionTitre: { fontSize: 15, fontWeight: '700', color: couleurs.texte },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: couleurs.carte,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: couleurs.bordure,
  },
  case: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: couleurs.bordure,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caseCochee: { backgroundColor: couleurs.succes, borderColor: couleurs.succes },
  coche: { color: '#fff', fontWeight: '800' },
  barre: { textDecorationLine: 'line-through', color: couleurs.discret },
  plus: { fontSize: 22, color: couleurs.discret, paddingHorizontal: 4 },
  voile: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  feuille: {
    backgroundColor: couleurs.carte,
    padding: 20,
    paddingBottom: 36,
    gap: 10,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
});
