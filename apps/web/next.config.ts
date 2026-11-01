import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Le moteur de règles est partagé en TypeScript source.
  transpilePackages: ['@maillot/domain'],
  // En développement, /api est relayé vers l'API locale. En production, c'est Nginx qui s'en charge.
  async rewrites() {
    return process.env.NODE_ENV === 'development'
      ? [{ source: '/api/:chemin*', destination: `${process.env.API_URL ?? 'http://127.0.0.1:4000'}/api/:chemin*` }]
      : [];
  },
};

export default nextConfig;
