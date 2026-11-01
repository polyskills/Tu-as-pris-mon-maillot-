// Build de production : un seul fichier dist/server.mjs.
// Le moteur de règles (@maillot/domain, TypeScript) et le client Prisma généré sont intégrés au fichier ;
// les autres dépendances restent dans node_modules.
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
const externes = Object.keys(pkg.dependencies).filter((d) => d !== '@maillot/domain');

await build({
  entryPoints: ['src/server.ts'],
  outfile: 'dist/server.mjs',
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  sourcemap: true,
  external: [...externes, '@prisma/client/*'],
  banner: {
    js: "import { createRequire as creerRequireCjs } from 'node:module'; const require = creerRequireCjs(import.meta.url);",
  },
  logLevel: 'info',
});
