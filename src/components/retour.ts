import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Retour haptique, ignoré là où il n'est pas disponible (web, simulateur).

export function vibrationLegere() {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function vibrationSucces() {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
