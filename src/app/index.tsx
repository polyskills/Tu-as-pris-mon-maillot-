import { Stack, router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { joursAvant, plusJours } from '../components/ChoixDate';
import { creerStyles, useCouleurs } from '../components/theme';
import { Avatar, BarreProgression, Bouton, couleurProfil, useStyles } from '../components/ui';
import { progression } from '../domain/generer';
import { Voyage } from '../domain/types';
import { useStore } from '../store/store';

const dateCourte = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

function compteARebours(v: Voyage): string {
  const j = joursAvant(v.depart);
  if (j > 1) return `J-${j}`;
  if (j === 1) return 'Demain';
  if (j === 0) return "Aujourd'hui";
  return joursAvant(plusJours(v.depart, v.nuits)) >= 0 ? 'En cours' : 'Terminé';
}

export default function Accueil() {
  const voyages = useStore((s) => s.voyages);
  const profils = useStore((s) => s.profils);
  const c = useCouleurs();
  const s = useStyles();
  const l = useStylesLocaux();
  const marges = useSafeAreaInsets();

  const estPasse = (v: Voyage) => joursAvant(plusJours(v.depart, v.nuits)) < 0;
  const aVenir = voyages.filter((v) => !estPasse(v)).sort((a, b) => a.depart.localeCompare(b.depart));
  const passes = voyages.filter(estPasse).sort((a, b) => b.depart.localeCompare(a.depart));

  const carte = (v: Voyage) => {
    const p = progression(v.articles.filter((a) => a.liste === 'valise'));
    const passe = estPasse(v);
    return (
      <Pressable key={v.id} onPress={() => router.push(`/voyage/${v.id}`)} style={[s.carte, passe && { opacity: 0.6 }]}>
        <View style={s.ligneEspacee}>
          <Text style={[s.titre, { flex: 1 }]} numberOfLines={1}>
            {v.nom}
          </Text>
          <View style={[l.badge, passe && { backgroundColor: c.bordure }]}>
            <Text style={l.badgeTexte}>{compteARebours(v)}</Text>
          </View>
        </View>
        <Text style={s.discret}>
          {dateCourte(v.depart)} · {v.nuits} nuit{v.nuits > 1 ? 's' : ''}
        </Text>
        <View style={[s.ligne, { gap: 4 }]}>
          {profils
            .filter((x) => v.participants.includes(x.id))
            .map((x) => (
              <Avatar key={x.id} prenom={x.prenom} couleur={couleurProfil(x, profils)} taille={24} />
            ))}
        </View>
        <BarreProgression faits={p.faits} total={p.total} />
        <Text style={s.discret}>
          {p.restants === 0 ? '✅ Valise bouclée' : `${p.faits} / ${p.total} dans la valise`}
        </Text>
      </Pressable>
    );
  };

  return (
    <ScrollView style={s.ecran} contentContainerStyle={s.contenu}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[l.entete, { paddingTop: marges.top + 16 }]}>
        <Text style={l.surtitre}>Tu as pris</Text>
        <Text style={s.grandTitre}>mon maillot ? 🩱</Text>
      </View>

      {profils.length === 0 ? (
        <View style={[s.carte, { gap: 14 }]}>
          <Text style={s.titre}>Bienvenue 👋</Text>
          <Text style={s.texte}>
            Commence par décrire ta famille : prénom, âge et habitudes de chacun. Tu ne le fais qu’une fois, ça sert
            pour tous les voyages.
          </Text>
          <Bouton titre="Créer ma famille" onPress={() => router.push('/famille/nouveau')} />
        </View>
      ) : (
        <>
          <Pressable onPress={() => router.push('/famille')} style={[s.carte, s.ligneEspacee]}>
            <View style={[s.ligne, { gap: 0 }]}>
              {profils.map((x, i) => (
                <View
                  key={x.id}
                  style={[l.avatarEmpile, { marginLeft: i === 0 ? 0 : -10, zIndex: profils.length - i }]}
                >
                  <Avatar prenom={x.prenom} couleur={couleurProfil(x, profils)} taille={36} />
                </View>
              ))}
            </View>
            <Text style={s.lien}>Ma famille ›</Text>
          </Pressable>

          <Bouton titre="+ Nouveau voyage" onPress={() => router.push('/voyage/edition')} />

          {voyages.length === 0 && <Text style={s.vide}>Aucun voyage pour l’instant.</Text>}
          {aVenir.length > 0 && <Text style={l.rubrique}>À venir</Text>}
          {aVenir.map(carte)}
          {passes.length > 0 && <Text style={l.rubrique}>Voyages passés</Text>}
          {passes.map(carte)}
        </>
      )}
    </ScrollView>
  );
}

const useStylesLocaux = creerStyles((c) => ({
  entete: { paddingBottom: 8 },
  surtitre: { fontSize: 16, color: c.discret, fontWeight: '600' },
  badge: { backgroundColor: c.soleil, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  badgeTexte: { color: '#1B1F2A', fontWeight: '800', fontSize: 13 },
  rubrique: { fontSize: 13, fontWeight: '700', color: c.discret, textTransform: 'uppercase', marginTop: 8 },
  avatarEmpile: { borderWidth: 2, borderColor: c.carte, borderRadius: 20 },
}));
