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
- **Catalogue en base** : importé une fois depuis `shared/domain/src/catalogue.ts` (catalogue de départ), puis modifié
  dans l'administration. L'API le garde en mémoire et le recharge après chaque modification ; l'interface le reçoit par
  `GET /api/catalogue` et génère les listes avec. Chaque modification du catalogue (création, modification,
  archivage, restauration, ordre) régénère tout de suite les **voyages à venir** (départ aujourd'hui ou plus tard), en
  gardant pointage, quantités ajustées et ajouts ; les voyages passés ne bougent pas. Un article archivé disparaît des
  listes régénérées, pointage compris.
- **Ordre** : l'ordre du catalogue (réglable par catégorie dans l'administration) est l'ordre des listes de valise.
  Chaque article de voyage garde son rang (`article_voyage.rang`).
- **Administration** (`/admin`) : rôles **admin** (catalogue + équipe) et **éditeur** (catalogue). Admins d'office :
  variable `ADMIN_EMAILS`. Pas de suppression définitive : archivage et restauration, historique avant / après.
- **Partage de la famille** : un compte appartient à une seule famille. Son propriétaire (au départ, celui qui l'a
  créée) invite d'autres adresses e-mail, retire des membres et peut confier ce rôle à un autre membre ; les membres
  voient et modifient tout (profils, voyages, pointage) et peuvent quitter la famille (ils repartent d'une famille
  vide). En acceptant une invitation, les profils et voyages du compte rejoignent la famille partagée (rien n'est
  perdu). Chaque article retient qui l'a coché en dernier (« Mis par … »).
- **Mises à jour en direct** : `GET /api/evenements` (Server-Sent Events) prévient les appareils d'une famille à
  chaque modification ; le message ne contient pas de données, l'interface relit l'état via l'API. Émetteur en
  mémoire (un seul processus). En-tête `X-Accel-Buffering: no` pour Nginx, battement toutes les 25 s (sous le
  `proxy_read_timeout` de 60 s). Relecture de secours toutes les 30 s si le flux est coupé.
- **Application installable et hors ligne** (PWA) : manifeste (`app/manifest.ts`), icônes dans `apps/web/public`
  (`icon.svg` est la source ; les PNG en sont tirés), service worker `public/sw.js` enregistré en production
  seulement. Le service worker garde les pages (réseau d'abord) et les fichiers de Next.js (cache d'abord), et
  pré-charge les pages des voyages du compte ; il ne met jamais `/api` en cache. Les données restent gérées par
  l'application : copie sur l'appareil (`localStorage`) pour s'ouvrir sans réseau, et file d'attente du pointage
  (case, quantité, liste) envoyée au retour du réseau. Hors ligne, les autres modifications (profils, voyages,
  ajouts) sont refusées avec un message. À la déconnexion, tout ce qui concerne le compte est effacé de l'appareil.
- **Données personnelles** : `GET /api/moi/export` renvoie tout ce qui concerne le compte et sa famille ;
  `DELETE /api/moi` supprime le compte (et sa famille s'il en est le seul membre ; refusé s'il gère une famille
  partagée sans l'avoir confiée) et retire son adresse partout (pointage, invitations, équipe du catalogue). Seul
  l'historique du catalogue garde l'adresse de son auteur (traçabilité des modifications de l'équipe).
- **E-mails** : Mailpit (capture locale, deploy/mailpit.md) en DEV et pour l’instant en PROD ; vrai SMTP avant l’ouverture au public.
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

1. ✅ Interface responsive Next.js
2. ✅ API Express + Prisma + MariaDB : comptes (lien de connexion par e-mail), familles, voyages, pointage, reprise des données du navigateur
3. ✅ Conformité au kit Polytools Admin v2 (pnpm, processus unique, variables, en-têtes, journaux)
4. ✅ Interface branchée sur l'API : connexion par lien, données sur le serveur, pointage instantané, récupération des données du navigateur
5. ✅ Catalogue en base + **Administration** (éditeur de règles, simulateur, archivage, historique, équipe)
6. ✅ Partage de la famille (invitation par e-mail, rôle de propriétaire transmissible) et pointage à plusieurs en
   direct, avec « Mis par … »
7. ✅ Application web installable (PWA) + mode hors ligne pour le pointage sur téléphone ; stores plus tard si besoin
8. Ouverture publique :
   - ✅ RGPD dans l'outil : page « Mon compte » avec export des données (JSON) et suppression du compte
   - ✅ Invitations limitées (20 en attente par famille, 20 envois par heure et par adresse IP)
   - ✅ Pages légales `/mentions-legales` et `/confidentialite` (lisibles sans compte), éditeur Adaptools, marque de
     Polyskills. Les informations sont dans `apps/web/src/lib/legal.ts` ; une valeur manquante s'affiche en jaune
     « à compléter » (capital, contact, hébergeur, prestataire d'e-mails, durée des journaux)
   - À faire : vrai service d'envoi d'e-mails, sauvegardes hors du VPS, fail2ban, freemium (paiement)

L'ancienne version Expo (React Native) est conservée sur la branche `archive/expo`.

## Branches

`develop` → site DEV (`voyage-dev`), `main` → PROD (`voyage`), promotion par Pull Request (`62-promote.sh`).

## Notes

- **Prisma 7 et non 8** : Prisma 8 (en préparation) ne gère pas encore MariaDB. Rester en 7.x.
- Le VPS fait tourner **MariaDB 10.11**, pas MySQL 8.0 comme l'indique la documentation Polytools.
