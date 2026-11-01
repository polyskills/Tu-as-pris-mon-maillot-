import { EventEmitter } from 'node:events';
import type { Request, Response } from 'express';

// Prévient en direct les appareils d'une famille qu'une donnée a changé (Server-Sent Events).
// Le message ne contient aucune donnée : l'interface relit simplement l'état via l'API, avec ses contrôles d'accès.
// Un seul processus sert l'API (contrat du kit d'hébergement) : un émetteur en mémoire suffit.

const emetteur = new EventEmitter();
emetteur.setMaxListeners(0);

const TOUTES = '*';
/** Commentaire envoyé régulièrement : garde la connexion ouverte à travers Nginx et les proxys. */
const BATTEMENT = 25_000;

type Changement = { origine?: string };

/** Signale un changement dans une famille. `origine` : identifiant de l'onglet auteur (il n'a pas besoin de relire). */
export function signaler(familleId: string, origine?: string) {
  emetteur.emit(familleId, { origine } satisfies Changement);
}

/** Signale un changement à toutes les familles (catalogue modifié : listes des voyages à venir régénérées). */
export function signalerATous() {
  emetteur.emit(TOUTES, {} satisfies Changement);
}

/** Ouvre le flux d'événements de la famille du compte. */
export function flux(familleId: string, req: Request, res: Response) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    // Nginx : pas de mise en mémoire tampon, sinon les événements arrivent en retard.
    'X-Accel-Buffering': 'no',
  });
  res.write('retry: 5000\n\n');

  const envoyer = (c: Changement) => res.write(`event: changement\ndata: ${JSON.stringify(c)}\n\n`);
  const battement = setInterval(() => res.write(': ping\n\n'), BATTEMENT);
  emetteur.on(familleId, envoyer);
  emetteur.on(TOUTES, envoyer);

  req.on('close', () => {
    clearInterval(battement);
    emetteur.off(familleId, envoyer);
    emetteur.off(TOUTES, envoyer);
  });
}

/** Nombre d'appareils à l'écoute (tests). */
export const abonnes = (familleId: string) => emetteur.listenerCount(familleId);
