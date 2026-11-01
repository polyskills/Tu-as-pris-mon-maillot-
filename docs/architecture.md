# Architecture

SaaS **indépendant** (aucune donnée, aucun compte, aucun code partagé avec Polytools). Il reprend la même stack
technique que Polytools pour être hébergé sur le même type de serveur et garder une maintenance homogène.

## Stack

| Couche | Choix |
|---|---|
| Serveur | Debian 12, Node.js 22 LTS, Nginx (reverse proxy + TLS Let's Encrypt), PM2 |
| Interface | Next.js 16 + React 19 + TypeScript 5.9, Tailwind CSS 4, Lucide, Zustand 5 |
| API (à venir) | Express 5 + Prisma (provider MySQL) + Zod, logs Pino |
| Base de données | MySQL **8.4 LTS** (8.0 n'est plus maintenu depuis avril 2026), base dédiée `maillot` + utilisateur dédié |
| Tests | Vitest |
| Outils | ESLint, Prettier |

## Organisation du dépôt (monorepo npm workspaces)

```
apps/web          Interface Next.js : appli responsive (smartphone, tablette, ordinateur), puis /admin
apps/api          (à venir) API Express + Prisma : comptes, familles, voyages, catalogue
shared/domain     Moteur de règles, types, libellés, catalogue de départ — sans dépendance à l'interface ni à la base
docs/             Décisions de tri, catalogue lisible (généré), architecture
```

## Principes

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
2. API Express + Prisma + MySQL : comptes (e-mail par lien magique), familles, voyages ; reprise des données du navigateur
3. Catalogue en base + **Administration** (éditeur de règles, simulateur, archivage, historique)
4. Partage de la famille et pointage à plusieurs
5. Application web installable (PWA) + mode hors ligne pour le pointage sur téléphone ; stores plus tard si besoin
6. Ouverture publique : sécurité (limitation de requêtes, en-têtes, fail2ban), sauvegardes hors du VPS, pages légales
   et RGPD, freemium (paiement)

L'ancienne version Expo (React Native) est conservée sur la branche `archive/expo`.
