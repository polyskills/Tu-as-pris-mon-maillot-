# Déploiement sur le VPS (Debian 12)

Cible : `https://voyage.adaptools.fr`, sur le même VPS que Polytools, mais cloisonné :
utilisateur Linux, dossier, base et utilisateur MariaDB dédiés.

| Élément | Valeur |
|---|---|
| Dossier | `/srv/maillot` |
| Utilisateur Linux | `maillot` (sans droits sudo) |
| Base | `maillot` (MariaDB 10.11), utilisateur `maillot` avec droits sur cette base seulement |
| Interface | Next.js sur `127.0.0.1:3100` |
| API | Express sur `127.0.0.1:4000` |
| Entrée publique | Nginx + certificat Let's Encrypt |

## 1. Prérequis (une fois, avec sudo)

```bash
# DNS : un enregistrement A « voyage.adaptools.fr » vers l'IP du VPS (chez le registrar d'adaptools.fr).

# Mémoire d'échange de 2 Go (le VPS n'en a pas : sécurité pendant les builds)
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Utilisateur dédié et dossier
sudo adduser --system --group --home /srv/maillot --shell /bin/bash maillot
```

## 2. Base de données

```bash
sudo mariadb <<'SQL'
CREATE DATABASE maillot CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'maillot'@'localhost' IDENTIFIED BY 'MOT_DE_PASSE_FORT';
GRANT ALL PRIVILEGES ON maillot.* TO 'maillot'@'localhost';
FLUSH PRIVILEGES;
SQL
```

## 3. Code, configuration, build

```bash
sudo -iu maillot
git clone -b claude/v1-locale https://github.com/polyskills/Tu-as-pris-mon-maillot-.git /srv/maillot
cd /srv/maillot
cp apps/api/.env.example apps/api/.env   # puis éditer : DATABASE_URL, PUBLIC_URL=https://voyage.adaptools.fr,
                                         # BETTER_AUTH_SECRET (openssl rand -base64 32), SMTP_*
npm ci
npm run build
npm run migrate
```

## 4. Lancement (PM2, sous l'utilisateur maillot)

```bash
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup   # affiche une commande sudo à lancer une fois pour le redémarrage automatique
```

## 5. Nginx et HTTPS (avec sudo)

```bash
sudo cp deploy/nginx-voyage.adaptools.fr.conf /etc/nginx/sites-available/voyage.adaptools.fr
sudo ln -s /etc/nginx/sites-available/voyage.adaptools.fr /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d voyage.adaptools.fr
```

## Mise à jour

```bash
sudo -iu maillot && cd /srv/maillot
git pull && npm ci && npm run build && npm run migrate
pm2 reload maillot-web maillot-api
```

## Sauvegardes (à mettre en place avant d'ouvrir au public)

Chaque nuit, `mariadb-dump` de la base `maillot`, chiffré, puis envoyé **hors du VPS** (stockage S3 ou autre serveur).
Tester une restauration de temps en temps.
