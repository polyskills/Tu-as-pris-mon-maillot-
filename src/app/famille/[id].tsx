import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Bouton, Champ, ChoixPuces, couleurs, Saisie, styles } from '../../components/ui';
import { CATEGORIES, HABITUDES } from '../../domain/libelles';
import { ArticlePerso, Categorie, Habitude, Profil } from '../../domain/types';
import { nouvelId, useStore } from '../../store/store';

// Catégories qu'on peut confier à quelqu'un pour les affaires communes.
const RESPONSABILITES: Partial<Record<Categorie, string>> = {
  papiers: CATEGORIES.papiers,
  sante: CATEGORIES.sante,
  electronique: CATEGORIES.electronique,
  toilette: CATEGORIES.toilette,
  bebe: CATEGORIES.bebe,
  voyage: CATEGORIES.voyage,
  maison: CATEGORIES.maison,
  loisirs: CATEGORIES.loisirs,
};

export default function EditionProfil() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const existant = useStore((s) => s.profils.find((p) => p.id === id));
  const enregistrer = useStore((s) => s.enregistrerProfil);
  const supprimer = useStore((s) => s.supprimerProfil);

  const [prenom, setPrenom] = useState(existant?.prenom ?? '');
  const [annee, setAnnee] = useState(existant ? String(existant.anneeNaissance) : '');
  const [habitudes, setHabitudes] = useState<Habitude[]>(existant?.habitudes ?? []);
  const [responsabilites, setResponsabilites] = useState<Categorie[]>(existant?.responsabilites ?? []);
  const [articlesPerso, setArticlesPerso] = useState<ArticlePerso[]>(existant?.articlesPerso ?? []);
  const [nouvelArticle, setNouvelArticle] = useState('');

  const anneeNum = Number(annee);
  const anneeValide = /^\d{4}$/.test(annee) && anneeNum > 1900 && anneeNum <= new Date().getFullYear();
  const valide = prenom.trim().length > 0 && anneeValide;

  const valider = () => {
    const profil: Profil = {
      id: existant?.id ?? nouvelId(),
      prenom: prenom.trim(),
      anneeNaissance: anneeNum,
      habitudes,
      responsabilites,
      articlesPerso,
    };
    enregistrer(profil);
    router.back();
  };

  const ajouterArticlePerso = () => {
    const nom = nouvelArticle.trim();
    if (!nom) return;
    setArticlesPerso([...articlesPerso, { id: nouvelId(), nom, categorie: 'loisirs', quantite: 1 }]);
    setNouvelArticle('');
  };

  const confirmerSuppression = () =>
    Alert.alert(`Supprimer ${existant?.prenom} ?`, 'Ses articles seront retirés des voyages.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          supprimer(existant!.id);
          router.back();
        },
      },
    ]);

  return (
    <ScrollView style={styles.ecran} contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: existant ? existant.prenom : 'Nouvelle personne' }} />

      <Champ libelle="Prénom">
        <Saisie value={prenom} onChangeText={setPrenom} placeholder="Léa" autoFocus={!existant} />
      </Champ>

      <Champ libelle="Année de naissance" aide="Sert à calculer la tranche d'âge (bébé, enfant, ado…) à chaque voyage.">
        <Saisie value={annee} onChangeText={setAnnee} placeholder="2018" keyboardType="number-pad" maxLength={4} />
      </Champ>

      <Champ libelle="Habitudes et besoins">
        <ChoixPuces options={HABITUDES} valeur={habitudes} onChange={setHabitudes} />
      </Champ>

      <Champ libelle="S'occupe des affaires communes" aide="Ex. : c'est elle qui gère les papiers et la trousse de secours.">
        <ChoixPuces options={RESPONSABILITES as Record<Categorie, string>} valeur={responsabilites} onChange={setResponsabilites} />
      </Champ>

      <Champ libelle="Toujours dans sa valise" aide="Ce que cette personne emporte à chaque fois, en plus de la base.">
        {articlesPerso.map((a) => (
          <View key={a.id} style={[styles.interrupteur, { paddingVertical: 4 }]}>
            <Text style={styles.texte}>{a.nom}</Text>
            <Pressable hitSlop={8} onPress={() => setArticlesPerso(articlesPerso.filter((x) => x.id !== a.id))}>
              <Text style={{ color: couleurs.danger }}>Retirer</Text>
            </Pressable>
          </View>
        ))}
        <Saisie
          value={nouvelArticle}
          onChangeText={setNouvelArticle}
          placeholder="Ex. : mon oreiller, la peluche lapin…"
          onSubmitEditing={ajouterArticlePerso}
          returnKeyType="done"
        />
      </Champ>

      <Bouton titre="Enregistrer" onPress={valider} desactive={!valide} />
      {existant && <Bouton titre="Supprimer" variante="danger" onPress={confirmerSuppression} />}
    </ScrollView>
  );
}
