import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { magicLink } from 'better-auth/plugins';
import { prisma } from './db';
import { env } from './env';
import { envoyerLienConnexion } from './mail';

/** Connexion sans mot de passe : un lien envoyé par e-mail. */
export const auth = betterAuth({
  baseURL: env.PUBLIC_URL,
  basePath: '/api/auth',
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.PUBLIC_URL],
  database: prismaAdapter(prisma, { provider: 'mysql' }),
  session: {
    expiresIn: 60 * 60 * 24 * 60, // 60 jours : on se reconnecte rarement
    updateAge: 60 * 60 * 24,
  },
  advanced: {
    useSecureCookies: env.PUBLIC_URL.startsWith('https://'),
  },
  plugins: [
    magicLink({
      expiresIn: 15 * 60,
      sendMagicLink: async ({ email, url }) => envoyerLienConnexion(email, url),
    }),
  ],
});
