import {
  Activite,
  ACTIVITES,
  CATEGORIES,
  CLIMATS,
  DESTINATIONS,
  HABITUDES,
  HEBERGEMENTS,
  MOTIFS,
  SEXES,
  TRANCHES,
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
  motif: enumDe(MOTIFS).default('vacances'),
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

/** Un voyage de travail se fait seul : un seul participant. */
export function verifierMotif(v: { motif?: string; participants: string[] }) {
  if (v.motif === 'travail' && v.participants.length !== 1) {
    throw new z.ZodError([
      {
        code: 'custom',
        path: ['participants'],
        message: 'Un voyage de travail a un seul participant',
        input: v.participants,
      },
    ]);
  }
}

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
        // « Travail » était une activité avant de devenir un motif : ignorée à l'import.
        activites: z.array(z.string()).transform((a) => a.filter((x): x is Activite => x in ACTIVITES)),
        articles: z.array(schemaArticleImporte).max(2000),
      }),
    )
    .max(200),
});

// --- Administration du catalogue ---

const valeurs = <K extends string>(r: Record<K, string>) => z.array(enumDe(r)).min(1).max(20).optional();

/** Condition sans exclusion : les « sauf » ne s'imbriquent pas. */
const conditionSimple = z.strictObject({
  motifs: valeurs(MOTIFS),
  destinations: valeurs(DESTINATIONS),
  climats: valeurs(CLIMATS),
  zones: valeurs(ZONES),
  transports: valeurs(TRANSPORTS),
  hebergements: valeurs(HEBERGEMENTS),
  activites: valeurs(ACTIVITES),
  ages: valeurs(TRANCHES),
  sexes: z
    .array(z.enum(['F', 'M']))
    .min(1)
    .max(2)
    .optional(),
  habitudes: valeurs(HABITUDES),
  machineALaver: z.boolean().optional(),
  nuitsMin: z.number().int().min(1).max(365).optional(),
});

const condition = conditionSimple.extend({
  sauf: z.union([conditionSimple, z.array(conditionSimple).min(1).max(10)]).optional(),
});

const quantiteCatalogue = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('fixe'), n: z.number().int().min(1).max(99) }),
  z.strictObject({
    type: z.literal('parJour'),
    ratio: z.number().min(0).max(10),
    plus: z.number().int().min(0).max(50).optional(),
    max: z.number().int().min(1).max(99).optional(),
    auChaud: z.number().min(0).max(10).optional(),
  }),
  z.strictObject({
    type: z.literal('parClimat'),
    chaud: z.number().int().min(1).max(99),
    tempere: z.number().int().min(1).max(99),
    froid: z.number().int().min(1).max(99),
  }),
  z.strictObject({ type: z.literal('parParticipant') }),
  z.strictObject({ type: z.literal('bas'), coupe: z.enum(['long', 'court']) }),
]);

/** Article du catalogue tel que saisi dans l'administration (l'identifiant est donné par le serveur). */
export const schemaArticleCatalogue = z.strictObject({
  nom: z.string().trim().min(1).max(200),
  categorie,
  portee: z.enum(['personne', 'commun']),
  mode: z.enum(['suggestion', 'voiture']).nullish(),
  achetable: z.boolean().optional(),
  si: z.union([condition, z.array(condition).min(1).max(20)]).nullish(),
  quantite: quantiteCatalogue.nullish(),
});

export const schemaEquipier = z.object({
  role: z.enum(['admin', 'editeur']),
});

export const schemaEmail = z
  .email()
  .max(255)
  .transform((e) => e.toLowerCase());

export const schemaSens = z.enum(['haut', 'bas']);
