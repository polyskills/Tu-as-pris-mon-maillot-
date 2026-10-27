import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Avatar, Bouton, couleurProfil, useStyles } from '../../components/ui';
import { trancheAge } from '../../domain/generer';
import { HABITUDES, TRANCHES } from '../../domain/libelles';
import { useStore } from '../../store/store';

export default function Famille() {
  const profils = useStore((s) => s.profils);
  const s = useStyles();
  const aujourdhui = new Date().toISOString().slice(0, 10);

  return (
    <ScrollView style={s.ecran} contentContainerStyle={s.contenu}>
      {profils.length === 0 && <Text style={s.vide}>Personne pour l’instant.</Text>}
      {profils.map((p) => (
        <Pressable key={p.id} onPress={() => router.push(`/famille/${p.id}`)} style={[s.carte, s.ligne, { gap: 14 }]}>
          <Avatar prenom={p.prenom} couleur={couleurProfil(p, profils)} taille={48} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={s.titre}>{p.prenom}</Text>
            <Text style={s.discret}>
              {TRANCHES[trancheAge(p.anneeNaissance, aujourdhui)]} · né(e) en {p.anneeNaissance}
            </Text>
            {p.habitudes.length > 0 && (
              <Text style={s.discret} numberOfLines={1}>
                {p.habitudes.map((h) => HABITUDES[h]).join(', ')}
              </Text>
            )}
          </View>
          <Text style={s.discret}>›</Text>
        </Pressable>
      ))}
      <Bouton titre="+ Ajouter une personne" variante="contour" onPress={() => router.push('/famille/nouveau')} />
    </ScrollView>
  );
}
