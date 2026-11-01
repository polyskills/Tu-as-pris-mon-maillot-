import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { creerApp } from './app';
import { prisma } from './db';
import { env } from './env';
import { journal } from './journal';
import type { IncomingMessage, ServerResponse } from 'node:http';

/** Partie de l'API de Next.js utilisée ici (Next n'est pas une dépendance de l'API). */
type FabriqueNext = (options: { dev: boolean; dir: string }) => {
  prepare(): Promise<void>;
  getRequestHandler(): (req: IncomingMessage, res: ServerResponse) => Promise<void>;
};

/**
 * En production, le même processus sert l'interface Next.js (déjà construite dans apps/web/.next).
 * En développement, l'interface tourne à part (pnpm dev) et relaie /api vers ce serveur.
 */
async function interfaceNext() {
  const dossierWeb = join(import.meta.dirname, '../../web');
  if (env.NODE_ENV !== 'production' || !existsSync(join(dossierWeb, '.next'))) return undefined;
  // Next est chargé depuis apps/web : c'est la même installation que celle qui a fait le build.
  const next = createRequire(join(dossierWeb, 'package.json'))('next') as FabriqueNext;
  const appli = next({ dev: false, dir: dossierWeb });
  await appli.prepare();
  return appli.getRequestHandler();
}

const pages = await interfaceNext();
const serveur = creerApp(pages).listen(env.PORT, env.HOST, () => {
  journal.info(`À l'écoute sur http://${env.HOST}:${env.PORT}${pages ? ' (interface + API)' : ' (API seule)'}`);
});

// Arrêt propre (systemd, Ctrl+C) : on termine les requêtes en cours puis on ferme la base.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    serveur.close(() => {
      void prisma.$disconnect().finally(() => process.exit(0));
    });
  });
}
