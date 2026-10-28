import { Alert, Platform } from 'react-native';

/** Demande confirmation avant une action destructive. Sur le web, Alert n'affiche rien : on passe par window.confirm. */
export function confirmer(titre: string, message: string, action: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${titre}\n\n${message}`)) action();
    return;
  }
  Alert.alert(titre, message, [
    { text: 'Annuler', style: 'cancel' },
    { text: 'Supprimer', style: 'destructive', onPress: action },
  ]);
}
