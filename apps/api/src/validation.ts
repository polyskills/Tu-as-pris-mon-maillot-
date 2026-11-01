import {
  ACTIVITES,
  CATEGORIES,
  CLIMATS,
  DESTINATIONS,
  HABITUDES,
  HEBERGEMENTS,
  SEXES,
  TRANSPORTS,
  ZONES,
} from '@maillot/domain';
import { z } from 'zod';

// Schémas de validation des données reçues, construits à partir des listes du moteur de règles :
// une valeur inconnue du moteur est refusée.

const cles = <K extends string>(r: Record<K, string>) => Object.keys(r) as [K, ...K[]];
const enumDe = <K extends string>(r: Record<K, string>) => z.enum(cles(r));

/** Identifiant généré par l'interface (lettres, chiffres, tirets). */
export const identifiant = z.string().regex(/^[a-z0-9-]{4,32}$/i, 'Identifiant invalide');

const categorie = enumDe(CATEGORIES);
const statut = z.enum(['a-prendre', 'dans-valise', 'pas-besoin']);
const liste = z.enum(['valise', 'courses', 'voiture']);
const anneeCourante = () => new Date().getFullYear();

export const schemaProfil = z.object({
  id: identifiant,
  prenom: z.string().trim().min(1).max(80),
  couleur: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i)
    .optional(),
  anneeNaissance: z
    .number()
    .int()
    .min(1900)
    .refine((a) => a <= anneeCourante(), 'Année dans le futur'),
  sexe: z.enum(cles(SEXES).filter((s) => s !== 'nc') as ['F', 'M']).optional(),
  habitudes: z.array(enumDe(HABITUDES)).max(30),
  responsabilites: z.array(categorie).max(20),
  articlesPerso: z
    .array(
      z.object({
        id: identifiant,
        nom: z.string().trim().min(1).max(200),
        categorie,
        quantite: z.number().int().min(1).max(99),
      }),
    )
    .max(100),
});

export const schemaParametresVoyage = z.object({
  nom: z.string().trim().min(1).max(120),
  depart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date attendue au format AAAA-MM-JJ'),
  nuits: z.number().int().min(0).max(365),
  destinations: z.array(enumDe(DESTINATIONS)),
  climat: enumDe(CLIMATS),
  zone: enumDe(ZONES),
  transports: z.array(enumDe(TRANSPORTS)),
  hebergement: enumDe(HEBERGEMENTS),
  machineALaver: z.boolean(),
  activites: z.array(enumDe(ACTIVITES)),
  participants: z.array(identifiant).min(1).max(30),
});

export const schemaNouveauVoyage = schemaParametresVoyage.extend({ id: identifiant });

export const schemaMajArticle = z
  .object({
    statut: statut.optional(),
    quantite: z.number().int().min(1).max(999).optional(),
    liste: liste.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Rien à modifier');

export const schemaAjoutArticle = z.object({
  nom: z.string().trim().min(1).max(200),
  categorie,
  proprietaire: z.string().min(1).max(32),
  liste: liste.default('valise'),
});

const schemaArticleImporte = z.object({
  id: z.string().min(1).max(120),
  nom: z.string().min(1).max(200),
  categorie,
  proprietaire: z.string().min(1).max(32),
  quantite: z.number().int().min(1).max(999),
  statut,
  liste,
  origine: z.enum(['catalogue', 'perso', 'ajout', 'suggestion']),
  ajuste: z.boolean().optional(),
  listeChoisie: z.boolean().optional(),
  achetable: z.boolean().optional(),
});

/** Données saisies dans le navigateur avant la création du compte. */
export const schemaImport = z.object({
  profils: z.array(schemaProfil).max(30),
  voyages: z
    .array(
      schemaNouveauVoyage.extend({
        participants: z.array(identifiant).max(30),
        articles: z.array(schemaArticleImporte).max(2000),
      }),
    )
    .max(200),
});
