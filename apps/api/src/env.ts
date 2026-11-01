import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().startsWith('mysql://'),
  PUBLIC_URL: z.url(),
  PORT: z.coerce.number().int().default(4000),
  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET doit faire au moins 32 caractères'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  MAIL_FROM: z.string().default('no-reply@adaptools.fr'),
});

/** Configuration lue une seule fois au démarrage : une variable manquante arrête l'API avec un message clair. */
export const env = schema.parse(process.env);
