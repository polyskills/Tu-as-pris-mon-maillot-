export class Introuvable extends Error {}
export class Conflit extends Error {}
export class NonConnecte extends Error {}
/** Connecté, mais sans le rôle demandé. */
export class Interdit extends Error {
  constructor(message = 'Accès réservé à l’équipe du catalogue') {
    super(message);
  }
}
