import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Le moteur de règles est partagé en TypeScript source.
  transpilePackages: ['@maillot/domain'],
  // En développement, /api est relayé vers l'API locale. En production, c'est Nginx qui s'en charge.
  // Le service worker n'est jamais gardé en cache : une nouvelle version est prise dès la visite suivante.
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
  async rewrites() {
    return process.env.NODE_ENV === 'development'
      ? [{ source: '/api/:chemin*', destination: `${process.env.API_URL ?? 'http://127.0.0.1:4000'}/api/:chemin*` }]
      : [];
  },
};

export default nextConfig;
