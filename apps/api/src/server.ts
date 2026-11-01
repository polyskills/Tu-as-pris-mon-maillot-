import { creerApp } from './app';
import { prisma } from './db';
import { env } from './env';
import { journal } from './journal';

const serveur = creerApp().listen(env.PORT, '127.0.0.1', () => {
  journal.info(`API à l'écoute sur http://127.0.0.1:${env.PORT}`);
});

// Arrêt propre (PM2, Ctrl+C) : on termine les requêtes en cours puis on ferme la base.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    serveur.close(() => {
      void prisma.$disconnect().finally(() => process.exit(0));
    });
  });
}
