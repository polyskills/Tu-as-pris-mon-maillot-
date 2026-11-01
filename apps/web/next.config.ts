import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Le moteur de règles est partagé en TypeScript source.
  transpilePackages: ['@maillot/domain'],
};

export default nextConfig;
