import type { MetadataRoute } from 'next';

/** Application installable (écran d'accueil du téléphone, ordinateur). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Tu as pris mon maillot ?',
    short_name: 'Maillot',
    description:
      'La liste de valise de chaque membre de la famille, adaptée au voyage, et le pointage avant de partir.',
    lang: 'fr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f5f6fa',
    theme_color: '#0e7c86',
    categories: ['travel', 'lifestyle', 'productivity'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
    shortcuts: [
      { name: 'Nouveau voyage', url: '/voyage/nouveau', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
    ],
  };
}
