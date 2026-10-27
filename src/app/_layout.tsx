import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { useCouleurs } from '../components/theme';

export default function RootLayout() {
  const sombre = useColorScheme() === 'dark';
  const c = useCouleurs();
  const base = sombre ? DarkTheme : DefaultTheme;
  const theme = {
    ...base,
    colors: { ...base.colors, background: c.fond, card: c.carte, text: c.texte, border: c.bordure, primary: c.accent },
  };

  return (
    <ThemeProvider value={theme}>
      <StatusBar style={sombre ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerTintColor: c.accent, headerBackTitle: 'Retour' }}>
        <Stack.Screen name="index" options={{ title: 'Mes voyages' }} />
        <Stack.Screen name="famille/index" options={{ title: 'Ma famille' }} />
        <Stack.Screen name="famille/[id]" options={{ title: 'Profil' }} />
        <Stack.Screen name="voyage/edition" options={{ title: 'Voyage' }} />
        <Stack.Screen name="voyage/[id]" options={{ title: 'Valise' }} />
      </Stack>
    </ThemeProvider>
  );
}
