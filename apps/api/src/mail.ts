import nodemailer from 'nodemailer';
import { env } from './env';
import { journal } from './journal';

const transport = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
    })
  : null;

/** Dernier lien envoyé par adresse : utilisé par les tests à la place d'une vraie boîte mail. */
export const derniersLiens = new Map<string, string>();

export async function envoyerLienConnexion(email: string, url: string) {
  derniersLiens.set(email, url);
  if (!transport) {
    // Développement : pas de serveur d'e-mails, le lien est affiché dans les logs.
    journal.info({ email, url }, 'Lien de connexion (SMTP non configuré)');
    return;
  }
  await transport.sendMail({
    from: env.MAIL_FROM,
    to: email,
    subject: 'Ton lien de connexion',
    text: `Bonjour,\n\nPour te connecter, ouvre ce lien (valable 15 minutes) :\n${url}\n\nSi tu n'as rien demandé, ignore ce message.`,
    html: `<p>Bonjour,</p><p>Pour te connecter, clique sur ce lien (valable 15 minutes) :</p><p><a href="${url}">Me connecter</a></p><p>Si tu n'as rien demandé, ignore ce message.</p>`,
  });
}
