import { z } from 'zod';

// Configuration lue dans process.env (fournie par le service en production, par .env en développement).
// Le kit d'hébergement fournit PORT, HOST et DATABASE_URL ; le reste vient de shared/app.env.

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().default(4000),
  DATABASE_URL: z.string().regex(/^(mysql|mariadb):\/\//, 'DATABASE_URL doit commencer par mysql:// ou mariadb://'),
  PUBLIC_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET doit faire au moins 32 caractères'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  MAIL_FROM: z.string().default('no-reply@adaptools.fr'),
  /** « oui » : sans serveur d'e-mails, écrit le lien de connexion dans les journaux (DEV uniquement, jamais en PROD). */
  LIENS_DANS_LES_JOURNAUX: z.enum(['oui', 'non']).default('non'),
  /** Adresses administratrices d'office (séparées par des virgules) : elles gèrent le catalogue et l'équipe. */
  ADMIN_EMAILS: z
    .string()
    .default('')
    .transform((s) =>
      s
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    ),
});

/** Une variable manquante ou invalide arrête l'API au démarrage avec un message clair. */
export const env = schema.parse(process.env);
