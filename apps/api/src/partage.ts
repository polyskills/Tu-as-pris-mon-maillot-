import { z } from 'zod';
import { prisma } from './db';
import { Conflit, Interdit, Introuvable } from './erreurs';
import { envoyerInvitation } from './mail';

// Partage d'une famille entre plusieurs comptes.
// - Un compte appartient à une seule famille. Le compte qui l'a créée en est propriétaire : il invite et retire,
//   et peut confier ce rôle à un autre membre.
// - Les membres voient et modifient tout (profils, voyages, pointage) ; ils peuvent quitter la famille.
// - Une invitation vise une adresse e-mail. La personne se connecte avec cette adresse (lien magique : adresse
//   vérifiée) et accepte ; ses profils et voyages rejoignent alors la famille partagée (rien n'est perdu).

const schemaEmail = z.string().trim().toLowerCase().pipe(z.email('Adresse e-mail invalide')).pipe(z.string().max(255));

/** Au-delà, il faut annuler des invitations avant d'en envoyer d'autres (chacune envoie un e-mail). */
const MAX_INVITATIONS = 20;

const PROPRIETAIRE = 'proprietaire';
const MEMBRE = 'membre';

async function roleDans(userId: string, familleId: string) {
  const m = await prisma.membre.findUnique({ where: { userId_familleId: { userId, familleId } } });
  return m?.role;
}

async function exigerProprietaire(userId: string, familleId: string) {
  if ((await roleDans(userId, familleId)) !== PROPRIETAIRE) {
    throw new Interdit('Réservé à la personne qui a créé la famille');
  }
}

/** Membres et invitations en attente de la famille du compte. */
export async function partage(userId: string, familleId: string) {
  const [membres, invitations] = await Promise.all([
    prisma.membre.findMany({
      where: { familleId },
      include: { user: { select: { email: true } } },
      orderBy: { creeLe: 'asc' },
    }),
    prisma.invitation.findMany({ where: { familleId }, orderBy: { creeLe: 'asc' } }),
  ]);
  return {
    monRole: membres.find((m) => m.userId === userId)?.role ?? MEMBRE,
    membres: membres.map((m) => ({ email: m.user.email, role: m.role, moi: m.userId === userId })),
    invitations: invitations.map((i) => ({ email: i.email, invitePar: i.invitePar, creeLe: i.creeLe.toISOString() })),
  };
}

export async function inviter(userId: string, familleId: string, auteur: string, donnees: unknown) {
  await exigerProprietaire(userId, familleId);
  const email = schemaEmail.parse((donnees as { email?: unknown } | undefined)?.email);
  const dejaMembre = await prisma.membre.count({ where: { familleId, user: { email } } });
  if (dejaMembre) throw new Conflit('Cette personne fait déjà partie de la famille');
  const enAttente = await prisma.invitation.count({ where: { familleId, email: { not: email } } });
  if (enAttente >= MAX_INVITATIONS) {
    throw new Conflit(`${MAX_INVITATIONS} invitations en attente au maximum : annule-en avant d’en envoyer d’autres`);
  }
  await prisma.invitation.upsert({
    where: { familleId_email: { familleId, email } },
    create: { familleId, email, invitePar: auteur },
    update: { invitePar: auteur, creeLe: new Date() },
  });
  await envoyerInvitation(email, auteur);
  return partage(userId, familleId);
}

export async function annulerInvitation(userId: string, familleId: string, email: string) {
  await exigerProprietaire(userId, familleId);
  const { count } = await prisma.invitation.deleteMany({ where: { familleId, email: email.toLowerCase() } });
  if (!count) throw new Introuvable('Invitation introuvable');
  return partage(userId, familleId);
}

/** Retire un membre : il retrouve une famille vide à sa prochaine requête. */
export async function retirerMembre(userId: string, familleId: string, email: string) {
  await exigerProprietaire(userId, familleId);
  const cible = await prisma.membre.findFirst({ where: { familleId, user: { email: email.toLowerCase() } } });
  if (!cible) throw new Introuvable('Membre introuvable');
  if (cible.userId === userId) throw new Conflit('Impossible de se retirer soi-même');
  await prisma.membre.delete({ where: { userId_familleId: { userId: cible.userId, familleId } } });
  return partage(userId, familleId);
}

/** Confie la famille à un autre membre : il devient propriétaire, le compte actuel devient simple membre. */
export async function confier(userId: string, familleId: string, email: string) {
  await exigerProprietaire(userId, familleId);
  const cible = await prisma.membre.findFirst({ where: { familleId, user: { email: email.toLowerCase() } } });
  if (!cible) throw new Introuvable('Membre introuvable');
  if (cible.userId === userId) throw new Conflit('Tu es déjà propriétaire de la famille');
  await prisma.$transaction([
    prisma.membre.update({
      where: { userId_familleId: { userId: cible.userId, familleId } },
      data: { role: PROPRIETAIRE },
    }),
    prisma.membre.update({ where: { userId_familleId: { userId, familleId } }, data: { role: MEMBRE } }),
  ]);
  return partage(userId, familleId);
}

/** Quitte une famille partagée (réservé aux membres invités : la famille reste à son propriétaire). */
export async function quitter(userId: string, familleId: string) {
  if ((await roleDans(userId, familleId)) === PROPRIETAIRE) {
    throw new Conflit('Tu es propriétaire de cette famille : confie-la d’abord à un autre membre');
  }
  await prisma.membre.deleteMany({ where: { userId, familleId } });
}

/** Invitations reçues par l'adresse du compte, sauf celle de sa propre famille. */
export async function invitationsRecues(email: string, familleId: string) {
  const invitations = await prisma.invitation.findMany({
    where: { email: email.toLowerCase(), familleId: { not: familleId } },
    include: { famille: { select: { profils: { select: { prenom: true }, orderBy: { creeLe: 'asc' } } } } },
    orderBy: { creeLe: 'asc' },
  });
  return invitations.map((i) => ({
    id: i.id,
    invitePar: i.invitePar,
    prenoms: i.famille.profils.map((p) => p.prenom),
  }));
}

async function invitationPour(email: string, invitationId: string) {
  const invitation = await prisma.invitation.findUnique({ where: { id: invitationId } });
  if (!invitation || invitation.email !== email.toLowerCase()) throw new Introuvable('Invitation introuvable');
  return invitation;
}

/**
 * Rejoint la famille de l'invitation. Les profils et voyages de la famille actuelle du compte y sont déplacés,
 * si le compte en était le seul membre ; sinon il la quitte simplement (elle reste aux autres membres).
 */
export async function accepter(userId: string, email: string, familleActuelle: string, invitationId: string) {
  const invitation = await invitationPour(email, invitationId);
  const cible = invitation.familleId;
  await prisma.$transaction(async (tx) => {
    const membres = await tx.membre.findMany({ where: { familleId: familleActuelle } });
    const seul = membres.length === 1;
    const moi = membres.find((m) => m.userId === userId);
    if (!seul && moi?.role === PROPRIETAIRE) {
      throw new Conflit('Tu partages déjà ta famille : confie-la à un autre membre avant d’en rejoindre une autre');
    }
    if (seul) {
      await tx.profil.updateMany({ where: { familleId: familleActuelle }, data: { familleId: cible } });
      await tx.voyage.updateMany({ where: { familleId: familleActuelle }, data: { familleId: cible } });
      await tx.famille.delete({ where: { id: familleActuelle } });
    } else {
      await tx.membre.delete({ where: { userId_familleId: { userId, familleId: familleActuelle } } });
    }
    await tx.membre.create({ data: { userId, familleId: cible, role: MEMBRE } });
    await tx.invitation.delete({ where: { id: invitation.id } });
  });
  return cible;
}

/** Refuse une invitation ; renvoie la famille qui avait invité (pour la prévenir). */
export async function refuser(email: string, invitationId: string) {
  const invitation = await invitationPour(email, invitationId);
  await prisma.invitation.delete({ where: { id: invitation.id } });
  return invitation.familleId;
}

/** Familles des comptes invités par cette famille (ceux qui ont déjà un compte). */
export async function famillesDesInvites(familleId: string) {
  const emails = (await prisma.invitation.findMany({ where: { familleId }, select: { email: true } })).map(
    (i) => i.email,
  );
  if (!emails.length) return [];
  const membres = await prisma.membre.findMany({ where: { user: { email: { in: emails } } } });
  return membres.map((m) => m.familleId);
}
