import { fromNodeHeaders, toNodeHandler } from 'better-auth/node';
import express, { NextFunction, Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { z } from 'zod';
import { auth } from './auth';
import * as donnees from './donnees';
import { Conflit, Introuvable } from './donnees';
import { env } from './env';
import { journal } from './journal';

// Réponses : les données directement en cas de succès, { erreur: { code, message } } sinon.

type Gestionnaire = (req: Request, res: Response) => Promise<unknown>;

/** Enveloppe une route : renvoie le résultat en JSON (204 si rien), et passe les erreurs au gestionnaire commun. */
const route =
  (f: Gestionnaire) =>
  (req: Request, res: Response, next: NextFunction): void => {
    f(req, res)
      .then((resultat) => (resultat === undefined ? res.status(204).end() : res.json(resultat)))
      .catch(next);
  };

const param = (req: Request, nom: string) => String(req.params[nom]);

/**
 * URL sans paramètres : le lien de connexion porte un jeton qui ne doit jamais finir dans les journaux.
 * Pour la même raison, aucun en-tête (cookies) n'est journalisé.
 */
const sansParametres = (url = '') => url.split('?')[0];

/**
 * Application Express. `pages` (facultatif) sert tout ce qui n'est pas /api : en production,
 * c'est Next.js, pour que l'interface et l'API tournent dans un seul processus (un service par site).
 */
export function creerApp(pages?: (req: Request, res: Response) => unknown) {
  const app = express();
  app.set('trust proxy', 1); // derrière Nginx
  app.disable('x-powered-by');
  app.use(
    pinoHttp({
      logger: journal,
      autoLogging: env.NODE_ENV !== 'test',
      serializers: {
        req: (req: { method: string; url: string }) => ({ method: req.method, url: sansParametres(req.url) }),
        // Jamais les en-têtes : ils contiennent les cookies de session.
        res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
      },
    }),
  );
  // Seulement sur l'API, et sans les en-têtes que Nginx pose déjà (contrat du kit d'hébergement).
  app.use(
    '/api',
    helmet({
      xFrameOptions: false,
      xContentTypeOptions: false,
      referrerPolicy: false,
      strictTransportSecurity: false,
    }),
  );

  const enTest = env.NODE_ENV === 'test';
  // Limites par adresse IP : générale, et plus stricte sur l'envoi des liens de connexion.
  app.use(
    '/api',
    rateLimit({
      windowMs: 15 * 60_000,
      limit: 600,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      skip: () => enTest,
    }),
  );
  app.use(
    '/api/auth/sign-in',
    rateLimit({
      windowMs: 15 * 60_000,
      limit: 10,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      skip: () => enTest,
    }),
  );

  // Better Auth lit lui-même le corps des requêtes : à monter avant express.json().
  app.all('/api/auth/*splat', toNodeHandler(auth));
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/sante', (_req, res) => {
    res.json({ ok: true });
  });

  // Toutes les routes suivantes exigent une session ; elles agissent sur la famille du compte.
  app.use('/api', (req, res, next) => {
    auth.api
      .getSession({ headers: fromNodeHeaders(req.headers) })
      .then(async (session) => {
        if (!session) return next(new NonConnecte());
        res.locals.familleId = await donnees.familleDuCompte(session.user.id);
        res.locals.email = session.user.email;
        next();
      })
      .catch(next);
  });

  const famille = (res: Response) => res.locals.familleId as string;

  app.get(
    '/api/moi',
    route(async (req, res) => ({ email: res.locals.email as string, familleId: famille(res) })),
  );
  app.get(
    '/api/etat',
    route(async (req, res) => donnees.etat(famille(res))),
  );
  app.post(
    '/api/import',
    route(async (req, res) => donnees.importer(famille(res), req.body)),
  );

  app.put(
    '/api/profils/:id',
    route(async (req, res) => donnees.enregistrerProfil(famille(res), { ...req.body, id: param(req, 'id') })),
  );
  app.delete(
    '/api/profils/:id',
    route(async (req, res) => donnees.supprimerProfil(famille(res), param(req, 'id'))),
  );

  app.post(
    '/api/voyages',
    route(async (req, res) => donnees.creerVoyage(famille(res), req.body)),
  );
  app.put(
    '/api/voyages/:id',
    route(async (req, res) => donnees.modifierVoyage(famille(res), param(req, 'id'), req.body)),
  );
  app.delete(
    '/api/voyages/:id',
    route(async (req, res) => donnees.supprimerVoyage(famille(res), param(req, 'id'))),
  );

  app.patch(
    '/api/voyages/:id/articles/:article',
    route(async (req, res) => donnees.majArticle(famille(res), param(req, 'id'), param(req, 'article'), req.body)),
  );
  app.post(
    '/api/voyages/:id/articles',
    route(async (req, res) => donnees.ajouterArticle(famille(res), param(req, 'id'), req.body)),
  );
  app.post(
    '/api/voyages/:id/suggestions/:article',
    route(async (req, res) => donnees.ajouterSuggestion(famille(res), param(req, 'id'), param(req, 'article'))),
  );
  app.delete(
    '/api/voyages/:id/articles/:article',
    route(async (req, res) => donnees.supprimerArticle(famille(res), param(req, 'id'), param(req, 'article'))),
  );

  app.use('/api', (_req, res) => {
    res.status(404).json({ erreur: { code: 'introuvable', message: 'Route inconnue' } });
  });

  if (pages) app.all('*splat', (req, res) => void pages(req, res));

  // Gestionnaire d'erreurs commun.
  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    void _next;
    if (err instanceof NonConnecte) {
      res.status(401).json({ erreur: { code: 'non-connecte', message: 'Connexion requise' } });
    } else if (err instanceof z.ZodError) {
      res.status(400).json({
        erreur: { code: 'invalide', message: 'Données invalides', details: z.flattenError(err).fieldErrors },
      });
    } else if (err instanceof Introuvable) {
      res.status(404).json({ erreur: { code: 'introuvable', message: err.message } });
    } else if (err instanceof Conflit) {
      res.status(409).json({ erreur: { code: 'conflit', message: err.message } });
    } else if (err instanceof SyntaxError && 'body' in err) {
      res.status(400).json({ erreur: { code: 'invalide', message: 'JSON invalide' } });
    } else {
      req.log.error({ err }, 'Erreur inattendue');
      res.status(500).json({ erreur: { code: 'serveur', message: 'Erreur interne' } });
    }
  });

  return app;
}

class NonConnecte extends Error {}
