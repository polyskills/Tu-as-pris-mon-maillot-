# Architecture

SaaS **indépendant** (aucune donnée, aucun compte, aucun code partagé avec Polytools). Il reprend la même stack
technique que Polytools pour être hébergé sur le même type de serveur et garder une maintenance homogène.

## Stack

| Couche | Choix |
|---|---|
| Serveur | Kit **Polytools Admin v2** : Debian 13, Node.js 22 LTS, Nginx (TLS Let's Encrypt), un service systemd isolé par site, releases et retour arrière automatique, sauvegardes chiffrées |
| Interface | Next.js 16 + React 19 + TypeScript 5.9, Tailwind CSS 4, Lucide, Zustand 5 |
| API | Express 5 + **Prisma 7** (connecteur MariaDB, compatible MySQL) + Zod, logs Pino, comptes avec **Better Auth** (lien de connexion par e-mail) |
| Base de données | **MariaDB 10.11 LTS** (celle du VPS, maintenue jusqu'en février 2028), base dédiée `maillot` + utilisateur dédié. Compatible MySQL 8.4 pour une migration future |
| Tests | Vitest |
| Outils | pnpm 11 (workspaces), ESLint, Prettier |

## Organisation du dépôt (monorepo pnpm)

```
apps/web          Interface Next.js : appli responsive (smartphone, tablette, ordinateur), puis /admin
apps/api          API Express + Prisma : comptes, familles, voyages, pointage, import ; migrations dans prisma/
deploy/           Registre et procédure pour le kit Polytools Admin v2
shared/domain     Moteur de règles, types, libellés, catalogue de départ — sans dépendance à l'interface ni à la base
docs/             Décisions de tri, catalogue lisible (généré), architecture
```

## Principes

- **Un seul processus en production** : Express sert `/api` et confie le reste à Next.js (un site = un port = un
  service pour le kit). En développement, interface et API tournent séparément.

- **Le moteur de règles est du TypeScript pur** (`shared/domain`) : il tourne dans le navigateur (génération des listes,
  y compris hors ligne) et pourra tourner côté API sans modification.
- **Tout accès aux données passera par l'API.** Aucune fonction propre à un hébergeur. Configuration par variables
  d'environnement. Évolutions de base versionnées (migrations Prisma).
- **Migration de la base** vers un MySQL géré (OVHcloud, Scaleway…) si le produit se développe : copie des données
  + changement de l'URL de connexion.

## Responsive

| Largeur | Navigation | Valise |
|---|---|---|
| < 768 px (smartphone) | Barre d'onglets en bas | Onglets personnes horizontaux, bouton flottant « Ajouter » |
| 768-1023 px (tablette) | Menu latéral | Onglets personnes horizontaux |
| ≥ 1024 px (ordinateur) | Menu latéral | Colonne des personnes à gauche, liste à droite ; questionnaire sur une page avec résumé |

Thème clair / sombre selon le réglage de l'appareil.

## État actuel et étapes

1. ✅ Interface responsive Next.js (données dans le navigateur, `localStorage`, en attendant l'API)
2. ✅ API Express + Prisma + MariaDB : comptes (lien de connexion par e-mail), familles, voyages, pointage, reprise des données du navigateur
3. ✅ Conformité au kit Polytools Admin v2 (pnpm, processus unique, variables, en-têtes, journaux)
4. Branchement de l'interface sur l'API (écran de connexion, données sur le serveur)
5. Catalogue en base + **Administration** (éditeur de règles, simulateur, archivage, historique)
6. Partage de la famille et pointage à plusieurs
7. Application web installable (PWA) + mode hors ligne pour le pointage sur téléphone ; stores plus tard si besoin
8. Ouverture publique : sécurité (limitation de requêtes, en-têtes, fail2ban), sauvegardes hors du VPS, pages légales
   et RGPD, freemium (paiement)

L'ancienne version Expo (React Native) est conservée sur la branche `archive/expo`.

## Branches

`develop` → site DEV (`voyage-dev`), `main` → PROD (`voyage`), promotion par Pull Request (`62-promote.sh`).

## Notes

- **Prisma 7 et non 8** : Prisma 8 (en préparation) ne gère pas encore MariaDB. Rester en 7.x.
- Le VPS fait tourner **MariaDB 10.11**, pas MySQL 8.0 comme l'indique la documentation Polytools.
