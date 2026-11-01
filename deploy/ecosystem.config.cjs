// PM2 : interface (Next.js) et API (Express), sous l'utilisateur Linux dédié « maillot ».
// Lancement : pm2 start deploy/ecosystem.config.cjs && pm2 save
module.exports = {
  apps: [
    {
      name: 'maillot-web',
      cwd: '/srv/maillot/apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3100 -H 127.0.0.1',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '400M',
    },
    {
      name: 'maillot-api',
      cwd: '/srv/maillot/apps/api',
      script: 'dist/server.mjs',
      node_args: '--env-file=.env --enable-source-maps',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '300M',
    },
  ],
};
