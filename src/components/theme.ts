import { StyleSheet, useColorScheme } from 'react-native';

// Identité : bleu océan pour les actions, jaune soleil pour les repères (compte à rebours, nouveautés).

export const clair = {
  fond: '#F5F6FA',
  carte: '#FFFFFF',
  texte: '#1B1F2A',
  discret: '#6B7280',
  bordure: '#E3E6EE',
  accent: '#0E7C86',
  accentTexte: '#FFFFFF',
  accentClair: '#DDF1F2',
  soleil: '#F6B93B',
  soleilClair: '#FEF3D7',
  succes: '#2E9E5B',
  danger: '#C2410C',
  voile: 'rgba(0,0,0,0.35)',
};

export type Couleurs = typeof clair;

export const sombre: Couleurs = {
  fond: '#0F1419',
  carte: '#1A2027',
  texte: '#E8ECF1',
  discret: '#9AA4B2',
  bordure: '#2A323C',
  accent: '#2BB3BE',
  accentTexte: '#06222A',
  accentClair: '#123A3E',
  soleil: '#F6C344',
  soleilClair: '#3A3020',
  succes: '#3CCB7F',
  danger: '#F97316',
  voile: 'rgba(0,0,0,0.6)',
};

export function useCouleurs(): Couleurs {
  return useColorScheme() === 'dark' ? sombre : clair;
}

/** Crée une feuille de styles pour chaque thème, et un hook qui renvoie la bonne. */
type Styles = Parameters<typeof StyleSheet.create>[0];

export function creerStyles<const T extends Styles>(f: (c: Couleurs) => T & Styles) {
  const versions = { clair: StyleSheet.create(f(clair)), sombre: StyleSheet.create(f(sombre)) };
  return () => (useColorScheme() === 'dark' ? versions.sombre : versions.clair);
}

/** Couleurs proposées pour distinguer les membres de la famille. */
export const COULEURS_PROFIL = ['#E76F51', '#2A9D8F', '#8E6CEF', '#F4A261', '#3A86FF', '#E5539B', '#43AA8B', '#B08968'];
