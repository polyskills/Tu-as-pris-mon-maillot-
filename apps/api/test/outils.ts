import request from 'supertest';
import { creerApp } from '../src/app';
import { oublierCatalogue } from '../src/catalogue';
import { prisma } from '../src/db';
import { derniersLiens } from '../src/mail';

export const app = creerApp();
const ORIGINE = process.env.PUBLIC_URL as string;

/** Vide toutes les tables entre deux fichiers de tests. */
export async function viderBase() {
  for (const table of [
    'catalogue_historique',
    'catalogue_article',
    'catalogue_evolution',
    'equipier',
    'invitation',
    'article_voyage',
    'voyage',
    'profil',
    'membre',
    'famille',
    'session',
    'account',
    'verification',
    'user',
  ]) {
    await prisma.$executeRawUnsafe(`DELETE FROM \`${table}\``);
  }
  oublierCatalogue();
}

/** Connexion complète par lien magique ; renvoie un client qui garde le cookie de session. */
export async function connecter(email: string) {
  const agent = request.agent(app);
  await agent.post('/api/auth/sign-in/magic-link').set('Origin', ORIGINE).send({ email, callbackURL: '/' }).expect(200);
  const lien = new URL(derniersLiens.get(email) as string);
  await agent
    .get(lien.pathname + lien.search)
    .set('Origin', ORIGINE)
    .expect(302);
  return agent;
}

export const profil = (id: string, prenom: string, anneeNaissance: number, extra: object = {}) => ({
  id,
  prenom,
  anneeNaissance,
  habitudes: [],
  responsabilites: [],
  articlesPerso: [],
  ...extra,
});

export const voyagePlage = (id: string, participants: string[]) => ({
  id,
  nom: 'Biarritz',
  depart: '2027-07-10',
  nuits: 7,
  destinations: ['plage'],
  climat: 'chaud',
  zone: 'france',
  transports: ['voiture'],
  hebergement: 'location',
  machineALaver: false,
  activites: [],
  participants,
});
