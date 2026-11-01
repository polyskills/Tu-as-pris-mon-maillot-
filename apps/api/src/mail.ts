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
    // Sans serveur d'e-mails : le lien n'est écrit dans les journaux qu'en développement, ou si on l'a demandé
    // explicitement (site DEV protégé). Il donne accès au compte : jamais en production.
    if (env.NODE_ENV !== 'production' || env.LIENS_DANS_LES_JOURNAUX === 'oui') {
      journal.info({ email, url }, 'Lien de connexion (SMTP non configuré)');
    } else {
      journal.error({ email }, 'Lien de connexion non envoyé : SMTP non configuré');
    }
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

/** Dernière invitation envoyée par adresse (tests). */
export const dernieresInvitations = new Map<string, string>();

const echapper = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Prévient une personne invitée à partager une famille. Le lien mène à l'outil : elle s'y connecte avec cette adresse. */
export async function envoyerInvitation(email: string, invitePar: string) {
  dernieresInvitations.set(email, invitePar);
  const url = env.PUBLIC_URL;
  if (!transport) {
    journal.info({ email, invitePar }, 'Invitation à partager une famille (SMTP non configuré)');
    return;
  }
  await transport.sendMail({
    from: env.MAIL_FROM,
    to: email,
    subject: `${invitePar} t'invite à préparer les valises ensemble`,
    text: `Bonjour,\n\n${invitePar} t'invite à partager sa famille sur « Tu as pris mon maillot ? » : mêmes profils, mêmes voyages, et chacun coche ce qu'il met dans la valise.\n\nPour accepter, connecte-toi avec cette adresse (${email}) :\n${url}\n\nSi tu ne connais pas cette personne, ignore ce message.`,
    html: `<p>Bonjour,</p><p><strong>${echapper(invitePar)}</strong> t'invite à partager sa famille sur « Tu as pris mon maillot ? » : mêmes profils, mêmes voyages, et chacun coche ce qu'il met dans la valise.</p><p>Pour accepter, connecte-toi avec cette adresse (${echapper(email)}) :</p><p><a href="${url}">Ouvrir Tu as pris mon maillot ?</a></p><p>Si tu ne connais pas cette personne, ignore ce message.</p>`,
  });
}
