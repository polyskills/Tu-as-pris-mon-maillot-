# Déploiement avec Polytools Admin v2

L'outil est un site (« slug ») comme les autres pour le kit : un compte `app-voyage`, une base `voyage_db`,
un service `polytools-voyage.service`, un vhost Nginx, des releases avec retour arrière automatique.
Projet **PROD + DEV** : `voyage` (`voyage.adaptools.fr`, branche `main`) et `voyage-dev` (protégé, branche `develop`).

## Ce que l'application respecte (contrat du kit)

| Exigence du kit | Dans l'outil |
|---|---|
| Écouter sur `HOST` / `PORT` | `apps/api/src/server.ts` : **un seul processus** sert l'API (`/api`) et l'interface Next.js |
| Configuration dans `process.env` | `apps/api/src/env.ts` (validée au démarrage) ; aucun fichier `.env` en production |
| Pas d'en-têtes X-Frame-Options, X-Content-Type-Options, Referrer-Policy, HSTS | Helmet limité à `/api`, ces 4 en-têtes désactivés |
| Journaux sur la sortie standard | Pino ; ni paramètres d'URL ni en-têtes (cookies) journalisés |
| `pnpm-lock.yaml` versionné, scripts d'installation autorisés | `pnpm-workspace.yaml`, clé `allowBuilds` |
| Pas de chemin serveur en dur, pas de fichier persistant | Aucun fichier écrit hors de la base |

## 1. Création du projet (une fois)

```bash
sudo bin/21-init-project.sh            # projet « voyage » → slugs voyage et voyage-dev, affiche 2 Deploy keys
# GitHub → polyskills/Tu-as-pris-mon-maillot- → Settings → Deploy keys : ajouter les deux, SANS droit d'écriture
sudo bin/23-set-repo.sh voyage
sudo bin/23-set-repo.sh voyage-dev
# DNS : enregistrements A voyage.adaptools.fr et (nom DEV choisi) vers l'IP du VPS
sudo bin/30-enable-https.sh voyage
sudo bin/30-enable-https.sh voyage-dev
```

## 2. Registre : `/etc/polytools/slugs/voyage.conf` (idem `voyage-dev.conf`)

```bash
START_CMD="node apps/api/dist/server.mjs"
GENERATE_CMD="pnpm --filter @maillot/api exec prisma generate --schema prisma/schema.prisma"
TEST_CMD="pnpm --filter @maillot/domain test"
MIGRATE_CMD="pnpm --filter @maillot/api exec prisma migrate deploy --schema prisma/schema.prisma"
BUILD_CMD="pnpm --filter @maillot/web build && pnpm --filter @maillot/api build"
MEM_MAX="768M"
HEALTH_PATH="/api/sante"
HEALTH_MATCH='"ok":true'
NOLOG_REGEX="^/api/auth/magic-link/verify"
MAX_BODY="2m"
SHARED_LINKS=""
```

`INSTALL_CMD` reste vide (installation par défaut du kit : `pnpm install --frozen-lockfile`).
`SHARED_LINKS` est vide : l'outil n'écrit aucun fichier. Puis : `sudo bin/26-apply-slug.sh voyage`.

## 3. Secrets : `/var/www/voyage/shared/app.env`

`PORT`, `HOST` et `DATABASE_URL` viennent du kit. À ajouter :

```bash
PUBLIC_URL="https://voyage.adaptools.fr"
BETTER_AUTH_SECRET="…"                      # openssl rand -base64 32 (différent en DEV et en PROD)
SMTP_HOST="…"
SMTP_PORT=587
SMTP_USER="…"
SMTP_PASSWORD="…"
MAIL_FROM="Tu as pris mon maillot <no-reply@adaptools.fr>"
```

Uniquement sur **voyage-dev**, tant qu'aucun SMTP n'est configuré : `LIENS_DANS_LES_JOURNAUX="oui"` écrit le lien de
connexion dans les journaux (`51-logs.sh voyage-dev`). **Jamais en PROD** : ce lien donne accès au compte.

```bash
sudo -u app-voyage nano /var/www/voyage/shared/app.env
```

## 4. Déployer

```bash
sudo bin/60-deploy.sh voyage-dev       # branche develop
sudo bin/62-promote.sh voyage          # Pull Request develop → main, puis déploiement PROD
```

Le kit enchaîne : dump de la base, release, `pnpm install --frozen-lockfile`, génération Prisma, tests du moteur,
migrations, build, bascule, contrôle de santé sur `/api/sante`, retour arrière automatique en cas d'échec.

## Vérifié en simulation (copie propre du dépôt, MariaDB 10.11)

Installation figée sans `NODE_ENV`, génération, tests, migrations, build, puis démarrage avec les seules variables
d'environnement (`NODE_ENV=production`, `HOST`, `PORT`, `DATABASE_URL`, contenu de `app.env`) :
santé OK, pages servies par le même processus, connexion par lien complète, aucun jeton ni cookie dans les journaux,
environ 210 Mo de mémoire.

## Points à confirmer sur le serveur

- Le kit v2 vise **Debian 13** ; le VPS actuel est en Debian 12.
- Version de pnpm installée par le kit : le dépôt déclare `pnpm@11.28.10` (`packageManager`).
