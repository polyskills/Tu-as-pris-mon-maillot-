import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// DATABASE_URL vient de apps/api/.env (développement) ou du service (production).
// Pas d'erreur si elle manque : `prisma generate` (lancé à l'installation) n'a pas besoin de la base.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
