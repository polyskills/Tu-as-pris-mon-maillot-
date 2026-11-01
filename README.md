# Tu as pris mon maillot ? (nom de travail)

SaaS responsive (smartphone, tablette, ordinateur) qui génère la liste de valise de chaque membre de la famille selon
le voyage, puis permet de pointer ce qui est vraiment dans la valise.

Architecture et choix techniques : [docs/architecture.md](docs/architecture.md).

## Lancer en local

Prérequis : Node.js 22.13 ou plus récent, pnpm 11 (`corepack enable pnpm`).

Prérequis supplémentaires : MariaDB 10.11 (ou MySQL 8.4) et Mailpit (capture des e-mails de connexion).

```bash
pnpm install
cp apps/api/.env.example apps/api/.env   # adapter DATABASE_URL et BETTER_AUTH_SECRET
pnpm migrate
mailpit                                  # e-mails lisibles sur http://127.0.0.1:8025
pnpm dev:api                             # API : http://127.0.0.1:4000
pnpm dev                                 # interface : http://localhost:3000 (/api relayé vers l'API)
```

Connexion : saisir une adresse, ouvrir l'e-mail reçu dans Mailpit, cliquer sur le lien.

Administration du catalogue : mettre son adresse dans `ADMIN_EMAILS` (apps/api/.env), se reconnecter, menu
**Catalogue**. Au premier démarrage, l'API importe le catalogue de départ en base.

Déploiement avec le kit Polytools Admin v2 : [deploy/README.md](deploy/README.md).

Autres commandes (depuis la racine) :

```bash
pnpm test            # tests du moteur et de l'API (l'API demande une base de test, cf. apps/api/.env.test)
pnpm typecheck
pnpm lint
pnpm build           # build de production (interface + API)
pnpm catalogue       # régénère docs/catalogue.md (catalogue de départ)
```

## Organisation du code

| Dossier | Contenu |
|---|---|
| `apps/web/src/app/` | Écrans (Next.js) : accueil, famille, profil, questionnaire voyage, valise |
| `apps/web/src/components/` | Mise en page responsive, composants d'interface, questionnaire |
| `apps/web/src/app/admin/` | Administration : catalogue, fiche article (éditeur de règles, aperçu, simulation), équipe |
| `apps/web/src/store/` | État de l'appli (Zustand) : mise à jour immédiate de l'écran, puis enregistrement via l'API |
| `apps/api/src/` | API : comptes, routes, accès aux données (`donnees.ts`), catalogue et équipe (`catalogue.ts`), validation (`validation.ts`) |
| `apps/api/prisma/` | Schéma de la base et migrations |
| `shared/domain/src/types.ts` | Modèle : profils, voyages, articles, conditions |
| `shared/domain/src/catalogue.ts` | Catalogue de départ (importé en base au premier démarrage) |
| `shared/domain/src/description.ts` | Règles traduites en français (administration, docs/catalogue.md) |
| `shared/domain/src/generer.ts` | Moteur : génération, suggestions, quantités, fusion après modification, progression |
| `docs/catalogue.md` | Catalogue de départ et ses règles en français (généré) |
| `docs/tri-base.md` | Décisions du tri de la base, catégorie par catégorie |

## Règles du moteur

- Une condition (`si`) liste des critères : tous doivent être vrais (ET). Dans un critère, une seule valeur suffit (OU).
  Un tableau de conditions = l'une ou l'autre. `sauf` exclut un cas (ex. : gants si froid, sauf au ski).
- Portée `personne` : un exemplaire par participant concerné (âge, sexe, habitudes). Portée `commun` : un seul pour le
  groupe, si au moins un participant est concerné.
- Quantités `parJour` : calculées sur nuits + 1 jours, plafonnés à 7 avec une machine à laver (ratio réduit au chaud
  possible). Aussi `parClimat` et `parParticipant`.
- Listes : valise ; courses sur place (articles achetables, en avion ou en train) ; check-list voiture (trajet en
  voiture). Suggestions ajoutées d'un clic.
- Modifier un voyage ou un profil régénère la liste sans perdre le pointage, les quantités ajustées ni les ajouts.
