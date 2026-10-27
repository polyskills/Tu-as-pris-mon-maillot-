import { Link, Stack, router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { BarreProgression, Bouton, couleurs, styles } from '../components/ui';
import { progression } from '../domain/generer';
import { useStore } from '../store/store';

const dateCourte = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

export default function Accueil() {
  const voyages = useStore((s) => s.voyages);
  const profils = useStore((s) => s.profils);

  return (
    <ScrollView style={styles.ecran} contentContainerStyle={styles.contenu}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Link href="/famille" asChild>
              <Pressable hitSlop={8}>
                <Text style={{ color: couleurs.accent, fontSize: 16 }}>Famille</Text>
              </Pressable>
            </Link>
          ),
        }}
      />

      {profils.length === 0 ? (
        <>
          <Text style={styles.vide}>
            Commence par décrire ta famille : prénom, âge et habitudes de chacun.{'\n'}
            Tu ne le fais qu'une fois, ça sert pour tous les voyages.
          </Text>
          <Bouton titre="Créer ma famille" onPress={() => router.push('/famille/nouveau')} />
        </>
      ) : (
        <>
          <Bouton titre="+ Nouveau voyage" onPress={() => router.push('/voyage/edition')} />
          {voyages.length === 0 && <Text style={styles.vide}>Aucun voyage pour l'instant.</Text>}
          {voyages.map((v) => {
            const p = progression(v.articles);
            return (
              <Link key={v.id} href={`/voyage/${v.id}`} asChild>
                <Pressable style={styles.carte}>
                  <Text style={styles.titre}>{v.nom}</Text>
                  <Text style={styles.discret}>
                    {dateCourte(v.depart)} · {v.nuits} nuit{v.nuits > 1 ? 's' : ''} · {v.participants.length} pers.
                  </Text>
                  <BarreProgression faits={p.faits} total={p.total} />
                  <Text style={styles.discret}>
                    {p.restants === 0 ? '✅ Valise bouclée' : `${p.faits} / ${p.total} dans la valise`}
                  </Text>
                </Pressable>
              </Link>
            );
          })}
        </>
      )}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}
