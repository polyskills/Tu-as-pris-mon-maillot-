import { prisma } from './db';
import { etat } from './donnees';
import { Conflit } from './erreurs';

// Droits sur les données personnelles (RGPD) : accès / portabilité (export) et effacement (suppression du compte).

/** Tout ce que l'outil garde sur le compte et sa famille, dans un format lisible et réutilisable (JSON). */
export async function exporter(userId: string, familleId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      sessions: { select: { createdAt: true, expiresAt: true, ipAddress: true, userAgent: true } },
      membres: { select: { familleId: true, role: true, creeLe: true } },
    },
  });
  const [famille, membres, invitationsEnvoyees, invitationsRecues, equipier] = await Promise.all([
    etat(familleId),
    prisma.membre.findMany({
      where: { familleId },
      select: { role: true, creeLe: true, user: { select: { email: true } } },
    }),
    prisma.invitation.findMany({ where: { familleId }, select: { email: true, invitePar: true, creeLe: true } }),
    prisma.invitation.findMany({ where: { email: user.email }, select: { invitePar: true, creeLe: true } }),
    prisma.equipier.findUnique({ where: { email: user.email }, select: { role: true, creeLe: true } }),
  ]);
  return {
    exporteLe: new Date().toISOString(),
    compte: {
      email: user.email,
      creeLe: user.createdAt.toISOString(),
      sessions: user.sessions,
      ...(equipier && { equipeDuCatalogue: equipier }),
    },
    famille: {
      id: familleId,
      membres: membres.map((m) => ({ email: m.user.email, role: m.role, depuis: m.creeLe })),
      invitationsEnAttente: invitationsEnvoyees,
      profils: famille.profils,
      voyages: famille.voyages,
    },
    invitationsRecues,
  };
}

/**
 * Supprime le compte. Sa famille est supprimée avec lui s'il en est le seul membre ; si elle est partagée, il la
 * quitte (elle reste aux autres membres), à condition de l'avoir d'abord confiée s'il en est propriétaire.
 * Son adresse est retirée partout : pointage (« Mis par »), invitations, équipe du catalogue.
 */
export async function supprimer(userId: string, email: string, familleId: string) {
  await prisma.$transaction(async (tx) => {
    const membres = await tx.membre.findMany({ where: { familleId } });
    const moi = membres.find((m) => m.userId === userId);
    if (membres.length > 1 && moi?.role === 'proprietaire') {
      throw new Conflit('Tu gères une famille partagée : confie-la d’abord à un autre membre');
    }
    if (membres.length === 1) await tx.famille.delete({ where: { id: familleId } });
    await tx.articleVoyage.updateMany({ where: { pointePar: email }, data: { pointePar: null } });
    await tx.invitation.deleteMany({ where: { OR: [{ email }, { invitePar: email }] } });
    await tx.equipier.deleteMany({ where: { email } });
    // Sessions, comptes de connexion et appartenance à la famille partent avec l'utilisateur (cascade).
    await tx.user.delete({ where: { id: userId } });
    await tx.verification.deleteMany({ where: { value: { contains: email } } });
  });
}
