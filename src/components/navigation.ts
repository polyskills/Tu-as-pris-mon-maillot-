import { Href, router } from 'expo-router';

/**
 * Revient à l'écran précédent, ou va sur `parDefaut` s'il n'y en a pas
 * (page rechargée ou ouverte directement dans le navigateur).
 */
export function revenir(parDefaut: Href) {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(parDefaut);
  }
}
