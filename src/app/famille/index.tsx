import { Link, router } from 'expo-router';
import { Pressable, ScrollView, Text } from 'react-native';
import { Bouton, styles } from '../../components/ui';
import { trancheAge } from '../../domain/generer';
import { HABITUDES } from '../../domain/libelles';
import { useStore } from '../../store/store';

const TRANCHES = { bebe: 'Bébé', enfant: 'Enfant', ado: 'Ado', adulte: 'Adulte', senior: 'Senior' };

export default function Famille() {
  const profils = useStore((s) => s.profils);
  const aujourdhui = new Date().toISOString().slice(0, 10);

  return (
    <ScrollView style={styles.ecran} contentContainerStyle={styles.contenu}>
      {profils.length === 0 && <Text style={styles.vide}>Personne pour l'instant.</Text>}
      {profils.map((p) => (
        <Link key={p.id} href={`/famille/${p.id}`} asChild>
          <Pressable style={styles.carte}>
            <Text style={styles.titre}>{p.prenom}</Text>
            <Text style={styles.discret}>
              {TRANCHES[trancheAge(p.anneeNaissance, aujourdhui)]} · né(e) en {p.anneeNaissance}
            </Text>
            {p.habitudes.length > 0 && (
              <Text style={styles.discret}>{p.habitudes.map((h) => HABITUDES[h]).join(', ')}</Text>
            )}
          </Pressable>
        </Link>
      ))}
      <Bouton titre="+ Ajouter une personne" onPress={() => router.push('/famille/nouveau')} />
    </ScrollView>
  );
}
