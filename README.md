# Tu as pris mon maillot ? (nom de travail)

SaaS responsive (smartphone, tablette, ordinateur) qui génère la liste de valise de chaque membre de la famille selon
le voyage, puis permet de pointer ce qui est vraiment dans la valise.

Architecture et choix techniques : [docs/architecture.md](docs/architecture.md).

## Lancer en local

Prérequis : Node.js 22.13 ou plus récent.

```bash
npm install
npm run dev          # http://localhost:3000
```

Autres commandes (depuis la racine) :

```bash
npm test             # tests du moteur de règles
npm run typecheck
npm run lint
npm run build        # build de production de l'interface
npm run catalogue    # régénère docs/catalogue.md après une modification du catalogue
```

Pour l'instant, les données restent dans le navigateur utilisé (en attendant l'API et les comptes).

## Organisation du code

| Dossier | Contenu |
|---|---|
| `apps/web/src/app/` | Écrans (Next.js) : accueil, famille, profil, questionnaire voyage, valise |
| `apps/web/src/components/` | Mise en page responsive, composants d'interface, questionnaire |
| `apps/web/src/store/` | État de l'appli (Zustand), stocké dans le navigateur |
| `shared/domain/src/types.ts` | Modèle : profils, voyages, articles, conditions |
| `shared/domain/src/catalogue.ts` | Base d'articles et leurs règles « on prend X si… » |
| `shared/domain/src/generer.ts` | Moteur : génération, suggestions, quantités, fusion après modification, progression |
| `docs/catalogue.md` | Tout le catalogue et ses règles en français (généré) |
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
