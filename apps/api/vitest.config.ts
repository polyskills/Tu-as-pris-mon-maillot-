import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Base de test réelle (MariaDB) : fichiers exécutés l'un après l'autre.
    fileParallelism: false,
    globalSetup: './test/preparation.ts',
    setupFiles: ['./test/env.ts'],
    testTimeout: 20_000,
  },
});
