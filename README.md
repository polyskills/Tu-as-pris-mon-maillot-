# Tu as pris mon maillot ? (nom de travail)

Appli mobile (iOS + Android) qui génère la liste de valise de chaque membre de la famille selon le voyage, puis permet de pointer ce qui est vraiment dans la valise.

## Lancer l'appli

```bash
npm install
npx expo start      # puis scanner le QR code avec l'appli Expo Go
npm test            # tests du moteur de règles
npm run typecheck
npm run lint
```

## Tester dans un navigateur (Mac ou PC)

Prérequis : Node.js 22.13 ou plus récent (version LTS sur nodejs.org).

```bash
npm install
npx expo start --web   # ouvre http://localhost:8081
```

Différences avec le téléphone : la date de départ se saisit au format AAAA-MM-JJ, pas de vibration, et les données restent dans le navigateur utilisé.

## Organisation du code

| Dossier | Contenu |
|---|---|
| `src/domain/types.ts` | Modèle : profils, voyages, articles, conditions |
| `src/domain/catalogue.ts` | Base d'articles (214) et leurs règles « on prend X si… » : mis d'office, en suggestion, achetables sur place ou en check-list voiture |
| `src/domain/generer.ts` | Moteur : génération, suggestions, quantités, fusion après modification, progression |
| `docs/tri-base.md` | Décisions du tri de la base, catégorie par catégorie |
| `src/store/` | État de l'appli (zustand), stocké en local (SQLite) |
| `src/app/` | Écrans (Expo Router) : accueil, famille, profil, questionnaire voyage, valise |
| `src/components/` | Composants d'interface communs |

## Règles du moteur

- Une condition (`si`) liste des critères : tous doivent être vrais (ET). Dans un critère, une seule valeur suffit (OU). Un tableau de conditions = l'une ou l'autre. `sauf` exclut un cas (ex. : gants si froid, sauf au ski).
- Portée `personne` : un exemplaire par participant concerné (âge, habitudes). Portée `commun` : un seul pour le groupe, si au moins un participant est concerné.
- Quantités `parJour` : calculées sur nuits + 1 jours, plafonnés à 7 avec une machine à laver (ratio réduit au chaud possible). Aussi `parClimat` et `parParticipant`.
- Listes : valise ; courses sur place (articles achetables, en avion ou en train) ; check-list voiture (trajet en voiture).
- Modifier un voyage ou un profil régénère la liste sans perdre le pointage, les quantités ajustées ni les ajouts manuels.

## Feuille de route

- **V1 (en cours)** : un seul utilisateur, tout en local, hors ligne
- **V2** : comptes + Firebase, partage de la famille et pointage à plusieurs en temps réel, météo automatique, retour d'expérience après le voyage
