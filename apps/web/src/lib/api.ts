// Appels à l'API (même domaine : /api). Les erreurs ont la forme { erreur: { code, message } }.

export class ErreurApi extends Error {
  constructor(
    public statut: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Identifiant de cet onglet, envoyé avec chaque requête : le serveur le joint aux événements en direct, pour que
 * l'onglet auteur d'une modification ne relise pas inutilement les données.
 */
export const ONGLET = Math.random().toString(36).slice(2, 12);

export async function api<T>(chemin: string, options: { methode?: string; corps?: unknown } = {}): Promise<T> {
  let reponse: Response;
  try {
    reponse = await fetch(`/api${chemin}`, {
      method: options.methode ?? 'GET',
      credentials: 'same-origin',
      headers: {
        'X-Onglet': ONGLET,
        ...(options.corps !== undefined && { 'Content-Type': 'application/json' }),
      },
      body: options.corps === undefined ? undefined : JSON.stringify(options.corps),
    });
  } catch {
    throw new ErreurApi(0, 'reseau', 'Pas de connexion au serveur');
  }
  if (reponse.status === 204) return undefined as T;
  const donnees = await reponse.json().catch(() => null);
  if (!reponse.ok) {
    const erreur = donnees?.erreur;
    throw new ErreurApi(reponse.status, erreur?.code ?? 'serveur', erreur?.message ?? 'Erreur du serveur');
  }
  return donnees as T;
}

/** Demande un lien de connexion par e-mail. */
export const demanderLien = (email: string) =>
  api<{ status: boolean }>('/auth/sign-in/magic-link', { methode: 'POST', corps: { email, callbackURL: '/' } });

export const deconnecter = () => api('/auth/sign-out', { methode: 'POST', corps: {} });
