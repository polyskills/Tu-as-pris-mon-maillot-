import { Stack, router, useLocalSearchParams } from 'expo-router';
import { confirmer } from '../../components/confirmer';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { COULEURS_PROFIL, useCouleurs } from '../../components/theme';
import { Avatar, Bouton, Champ, ChoixPuces, couleurProfil, Saisie, useStyles } from '../../components/ui';
import { habitudesParDefaut } from '../../domain/generer';
import { CATEGORIES, HABITUDES } from '../../domain/libelles';
import { ArticlePerso, Categorie, Habitude, Profil } from '../../domain/types';
import { nouvelId, useStore } from '../../store/store';

// Catégories qu'on peut confier à quelqu'un pour les affaires communes.
const RESPONSABILITES = {
  papiers: CATEGORIES.papiers,
  sante: CATEGORIES.sante,
  electronique: CATEGORIES.electronique,
  toilette: CATEGORIES.toilette,
  bebe: CATEGORIES.bebe,
  voyage: CATEGORIES.voyage,
  maison: CATEGORIES.maison,
  loisirs: CATEGORIES.loisirs,
} as Record<Categorie, string>;

export default function EditionProfil() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profils = useStore((s) => s.profils);
  const existant = profils.find((p) => p.id === id);
  const enregistrer = useStore((s) => s.enregistrerProfil);
  const supprimer = useStore((s) => s.supprimerProfil);
  const c = useCouleurs();
  const s = useStyles();

  const [prenom, setPrenom] = useState(existant?.prenom ?? '');
  const [couleur, setCouleur] = useState(
    existant ? couleurProfil(existant, profils) : COULEURS_PROFIL[profils.length % COULEURS_PROFIL.length],
  );
  const [annee, setAnnee] = useState(existant ? String(existant.anneeNaissance) : '');
  const [habitudes, setHabitudes] = useState<Habitude[]>(existant?.habitudes ?? []);
  // Tant qu'on n'a pas touché aux habitudes d'un nouveau profil, l'âge les pré-coche.
  const [habitudesTouchees, setHabitudesTouchees] = useState(!!existant);

  const changerAnnee = (texte: string) => {
    setAnnee(texte);
    if (!habitudesTouchees && /^\d{4}$/.test(texte)) {
      setHabitudes(habitudesParDefaut(Number(texte), new Date().getFullYear()));
    }
  };
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
      couleur,
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
    confirmer(`Supprimer ${existant?.prenom} ?`, 'Ses articles seront retirés des voyages.', () => {
      supprimer(existant!.id);
      router.back();
    });

  return (
    <ScrollView style={s.ecran} contentContainerStyle={[s.contenu, { gap: 20 }]} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: existant ? existant.prenom : 'Nouvelle personne' }} />

      <View style={{ alignItems: 'center', gap: 12 }}>
        <Avatar prenom={prenom || '?'} couleur={couleur} taille={72} />
        <View style={[s.ligne, { gap: 8 }]}>
          {COULEURS_PROFIL.map((k) => (
            <Pressable
              key={k}
              onPress={() => setCouleur(k)}
              hitSlop={4}
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: k,
                borderWidth: 3,
                borderColor: k === couleur ? c.texte : 'transparent',
              }}
            />
          ))}
        </View>
      </View>

      <Champ libelle="Prénom">
        <Saisie value={prenom} onChangeText={setPrenom} placeholder="Léa" autoFocus={!existant} />
      </Champ>

      <Champ libelle="Année de naissance" aide="Sert à calculer la tranche d'âge (bébé, enfant, ado…) à chaque voyage.">
        <Saisie value={annee} onChangeText={changerAnnee} placeholder="2018" keyboardType="number-pad" maxLength={4} />
      </Champ>

      <Champ libelle="Habitudes et besoins">
        <ChoixPuces
          options={HABITUDES}
          valeur={habitudes}
          onChange={(h) => {
            setHabitudes(h);
            setHabitudesTouchees(true);
          }}
        />
      </Champ>

      <Champ
        libelle="S'occupe des affaires communes"
        aide="Ex. : c'est elle qui gère les papiers et la trousse de secours."
      >
        <ChoixPuces options={RESPONSABILITES} valeur={responsabilites} onChange={setResponsabilites} />
      </Champ>

      <Champ libelle="Toujours dans sa valise" aide="Ce que cette personne emporte à chaque fois, en plus de la base.">
        {articlesPerso.map((a) => (
          <View key={a.id} style={[s.ligneEspacee, { paddingVertical: 4 }]}>
            <Text style={s.texte}>{a.nom}</Text>
            <Pressable hitSlop={8} onPress={() => setArticlesPerso(articlesPerso.filter((x) => x.id !== a.id))}>
              <Text style={{ color: c.danger }}>Retirer</Text>
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
