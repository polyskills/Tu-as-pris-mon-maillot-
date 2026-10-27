import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { couleurs } from '../components/ui';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerTintColor: couleurs.accent,
          headerTitleStyle: { color: couleurs.texte },
          contentStyle: { backgroundColor: couleurs.fond },
          headerBackTitle: 'Retour',
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Mes voyages' }} />
        <Stack.Screen name="famille/index" options={{ title: 'Ma famille' }} />
        <Stack.Screen name="famille/[id]" options={{ title: 'Profil' }} />
        <Stack.Screen name="voyage/edition" options={{ title: 'Voyage' }} />
        <Stack.Screen name="voyage/[id]" options={{ title: 'Valise' }} />
      </Stack>
    </>
  );
}
