# Mailpit sur le VPS (en attendant un vrai service d'envoi)

Mailpit est un faux serveur d'e-mails : il **capte tous les messages** envoyés par l'outil (liens de connexion) et les
affiche dans une page web. Aucun e-mail ne part réellement. Il sert à `voyage-dev` et, pour l'instant, à `voyage`.

⚠️ Tant que la PROD utilise Mailpit, seul l'administrateur peut se connecter (en lisant le lien dans Mailpit).
Avant d'ouvrir l'outil à d'autres personnes : vrai service SMTP (Brevo, OVH…) dans `shared/app.env` de `voyage`.

## Installation (une fois, avec sudo)

```bash
# Binaire officiel (vérifier la version sur https://github.com/axllent/mailpit/releases)
cd /tmp
curl -sSLO https://github.com/axllent/mailpit/releases/latest/download/mailpit-linux-amd64.tar.gz
tar -xzf mailpit-linux-amd64.tar.gz mailpit
sudo install -m 0755 mailpit /usr/local/bin/mailpit
mailpit version

# Service systemd : écoute uniquement en local, compte système éphémère, 500 messages gardés
sudo tee /etc/systemd/system/mailpit.service >/dev/null <<'EOF'
[Unit]
Description=Mailpit (capture des e-mails de test)
After=network.target

[Service]
DynamicUser=yes
StateDirectory=mailpit
ExecStart=/usr/local/bin/mailpit --listen 127.0.0.1:8025 --smtp 127.0.0.1:1025 \
  --database /var/lib/mailpit/mailpit.db --max 500 --disable-version-check
Restart=on-failure
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable --now mailpit
systemctl status mailpit --no-pager
```

## Réglages dans `shared/app.env` (voyage-dev et voyage)

```bash
SMTP_HOST="127.0.0.1"
SMTP_PORT=1025
SMTP_USER=""
SMTP_PASSWORD=""
MAIL_FROM="Tu as pris mon maillot <no-reply@adaptools.fr>"
```

Puis redéployer ou redémarrer le service du slug.

## Lire les e-mails

L'interface de Mailpit n'est **pas** exposée sur Internet. Depuis le Mac, par un tunnel SSH :

```bash
ssh -p 222 -L 8025:127.0.0.1:8025 debian@<ip-du-vps>
# puis ouvrir http://localhost:8025 dans le navigateur
```

## À vérifier

Le bac à sable systemd des services du kit doit autoriser la connexion à `127.0.0.1:1025` (comme pour MariaDB en
local). Test : demander un lien de connexion sur `voyage-dev`, puis vérifier qu'il apparaît dans Mailpit.
En cas d'échec, `51-logs.sh voyage-dev` affiche l'erreur d'envoi.
