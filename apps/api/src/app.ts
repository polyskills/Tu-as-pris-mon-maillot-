import { fromNodeHeaders, toNodeHandler } from 'better-auth/node';
import express, { NextFunction, Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { z } from 'zod';
import { auth } from './auth';
import * as catalogue from './catalogue';
import * as donnees from './donnees';
import { Conflit, Interdit, Introuvable, NonConnecte } from './erreurs';
import { env } from './env';
import { journal } from './journal';
import * as partage from './partage';

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
        res.locals.userId = session.user.id;
        res.locals.familleId = await donnees.familleDuCompte(session.user.id);
        res.locals.email = session.user.email;
        res.locals.role = await catalogue.roleDe(session.user.email);
        next();
      })
      .catch(next);
  });

  const famille = (res: Response) => res.locals.familleId as string;
  const compte = (res: Response) => res.locals.userId as string;
  const email = (res: Response) => res.locals.email as string;

  app.get(
    '/api/moi',
    route(async (req, res) => ({
      email: email(res),
      familleId: famille(res),
      ...(res.locals.role && { role: res.locals.role as catalogue.Role }),
      invitations: await partage.invitationsRecues(email(res), famille(res)),
    })),
  );

  // --- Partage de la famille ---
  app.get(
    '/api/famille/partage',
    route(async (req, res) => partage.partage(compte(res), famille(res))),
  );
  app.post(
    '/api/famille/invitations',
    route(async (req, res) => partage.inviter(compte(res), famille(res), email(res), req.body)),
  );
  app.delete(
    '/api/famille/invitations/:email',
    route(async (req, res) => partage.annulerInvitation(compte(res), famille(res), param(req, 'email'))),
  );
  app.delete(
    '/api/famille/membres/:email',
    route(async (req, res) => partage.retirerMembre(compte(res), famille(res), param(req, 'email'))),
  );
  app.post(
    '/api/famille/quitter',
    route(async (req, res) => {
      await partage.quitter(compte(res), famille(res));
      return donnees.etat(await donnees.familleDuCompte(compte(res)));
    }),
  );
  app.post(
    '/api/invitations/:id/accepter',
    route(async (req, res) => {
      const rejointe = await partage.accepter(compte(res), email(res), famille(res), param(req, 'id'));
      return donnees.etat(rejointe);
    }),
  );
  app.post(
    '/api/invitations/:id/refuser',
    route(async (req, res) => partage.refuser(email(res), param(req, 'id'))),
  );
  // Catalogue en service : l'interface génère les listes avec, comme le serveur.
  app.get(
    '/api/catalogue',
    route(async () => catalogue.catalogueEnService()),
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

  // --- Administration : catalogue (admin et éditeur), équipe (admin) ---
  const exiger =
    (...roles: catalogue.Role[]) =>
    (_req: Request, res: Response, next: NextFunction) =>
      next(roles.includes(res.locals.role) ? undefined : new Interdit());
  const auteur = (res: Response) => res.locals.email as string;

  // Chaque modification du catalogue s'applique tout de suite aux voyages à venir.
  const puisRegenerer = async <T extends object>(ecriture: Promise<T>) => {
    const resultat = await ecriture;
    return { ...resultat, voyagesMisAJour: await donnees.regenererVoyagesAVenir() };
  };

  app.use('/api/admin', exiger('admin', 'editeur'));
  app.get(
    '/api/admin/catalogue',
    route(async () => catalogue.listerAdmin()),
  );
  app.post(
    '/api/admin/catalogue',
    route(async (req, res) => puisRegenerer(catalogue.creerArticle(auteur(res), req.body))),
  );
  app.put(
    '/api/admin/catalogue/:id',
    route(async (req, res) => puisRegenerer(catalogue.modifierArticle(auteur(res), param(req, 'id'), req.body))),
  );
  app.post(
    '/api/admin/catalogue/:id/archiver',
    route(async (req, res) => puisRegenerer(catalogue.archiverArticle(auteur(res), param(req, 'id'), true))),
  );
  app.post(
    '/api/admin/catalogue/:id/restaurer',
    route(async (req, res) => puisRegenerer(catalogue.archiverArticle(auteur(res), param(req, 'id'), false))),
  );
  app.post(
    '/api/admin/catalogue/:id/deplacer',
    route(async (req) => {
      const articles = await catalogue.deplacerArticle(param(req, 'id'), req.body?.sens);
      return { articles, voyagesMisAJour: await donnees.regenererVoyagesAVenir() };
    }),
  );
  app.get(
    '/api/admin/historique',
    route(async (req) => catalogue.historique(typeof req.query.article === 'string' ? req.query.article : undefined)),
  );

  app.use('/api/admin/equipe', exiger('admin'));
  app.get(
    '/api/admin/equipe',
    route(async () => catalogue.equipe()),
  );
  app.put(
    '/api/admin/equipe/:email',
    route(async (req, res) => catalogue.enregistrerEquipier(auteur(res), param(req, 'email'), req.body)),
  );
  app.delete(
    '/api/admin/equipe/:email',
    route(async (req, res) => catalogue.retirerEquipier(auteur(res), param(req, 'email'))),
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
    } else if (err instanceof Interdit) {
      res.status(403).json({ erreur: { code: 'interdit', message: err.message } });
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
