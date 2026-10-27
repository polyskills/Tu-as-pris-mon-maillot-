# Tu as pris mon maillot ? (nom de travail)

Appli mobile (iOS + Android) qui génère la liste de valise de chaque membre de la famille selon le voyage, puis permet de pointer ce qui est vraiment dans la valise.

## Lancer l'appli

```bash
npm install
npx expo start      # puis scanner le QR code avec l'appli Expo Go
npm test            # tests du moteur de règles
npm run typecheck
```

## Organisation du code

| Dossier | Contenu |
|---|---|
| `src/domain/types.ts` | Modèle : profils, voyages, articles, conditions |
| `src/domain/catalogue.ts` | Base d'articles (~190) et leurs règles « on prend X si… » |
| `src/domain/generer.ts` | Moteur : génération, quantités, fusion après modification, progression |
| `src/store/` | État de l'appli (zustand), stocké en local (SQLite) |
| `src/app/` | Écrans (Expo Router) : accueil, famille, profil, questionnaire voyage, valise |
| `src/components/` | Composants d'interface communs |

## Règles du moteur

- Une condition (`si`) liste des critères : tous doivent être vrais (ET). Dans un critère, une seule valeur suffit (OU). Un tableau de conditions = l'une ou l'autre.
- Portée `personne` : un exemplaire par participant concerné (âge, habitudes). Portée `commun` : un seul pour le groupe, si au moins un participant est concerné.
- Quantités `parJour` : calculées sur nuits + 1 jours, plafonnés à 7 avec une machine à laver.
- Modifier un voyage ou un profil régénère la liste sans perdre le pointage, les quantités ajustées ni les ajouts manuels.

## Feuille de route

- **V1 (en cours)** : un seul utilisateur, tout en local, hors ligne
- **V2** : comptes + Firebase, partage de la famille et pointage à plusieurs en temps réel, météo automatique, retour d'expérience après le voyage
