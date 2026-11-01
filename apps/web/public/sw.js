// Service worker : l'application s'ouvre et se parcourt sans réseau (pages et fichiers déjà vus).
// Les données (profils, voyages, pointage) ne passent pas par ici : l'application les garde elle-même sur l'appareil
// et envoie le pointage fait hors ligne au retour du réseau. /api n'est jamais mis en cache.

const VERSION = 'v1';
const PAGES = `pages-${VERSION}`;
const FICHIERS = `fichiers-${VERSION}`;
const ESSENTIELS = ['/', '/famille', '/connexion', '/manifest.webmanifest', '/icon-192.png', '/icon.svg'];
/** Au-delà, on sert la page gardée en mémoire plutôt que d'attendre un réseau très lent. */
const DELAI_RESEAU = 4000;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((cache) => Promise.all(ESSENTIELS.map((url) => mettreEnCache(cache, url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((noms) => Promise.all(noms.filter((n) => n !== PAGES && n !== FICHIERS).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const requete = event.request;
  if (requete.method !== 'GET') return;
  const url = new URL(requete.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  // Données de navigation de Next.js : réseau seulement. En cas d'échec, Next recharge la page entière,
  // qui est alors servie depuis le cache ci-dessous.
  if (requete.headers.get('RSC') || url.searchParams.has('_rsc')) return;

  if (requete.mode === 'navigate') {
    event.respondWith(page(requete));
  } else if (url.pathname.startsWith('/_next/static/')) {
    // Fichiers dont le nom change à chaque version : le cache suffit.
    event.respondWith(cacheDabord(requete));
  } else if (!url.pathname.startsWith('/_next/')) {
    event.respondWith(cacheEtMiseAJour(requete));
  }
});

/** Pages : réseau d'abord (toujours la dernière version), sinon la copie gardée, sinon une page d'attente. */
async function page(requete) {
  const cache = await caches.open(PAGES);
  try {
    const reponse = await avecDelai(fetch(requete), DELAI_RESEAU);
    if (reponse.ok && !reponse.redirected) await cache.put(cleDePage(requete.url), reponse.clone());
    return reponse;
  } catch {
    return (
      (await cache.match(cleDePage(requete.url))) ??
      new Response(PAGE_HORS_LIGNE, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
    );
  }
}

async function cacheDabord(requete) {
  const cache = await caches.open(FICHIERS);
  const garde = await cache.match(requete);
  if (garde) return garde;
  const reponse = await fetch(requete);
  if (reponse.ok) await cache.put(requete, reponse.clone());
  return reponse;
}

async function cacheEtMiseAJour(requete) {
  const cache = await caches.open(FICHIERS);
  const garde = await cache.match(requete);
  const reseau = fetch(requete)
    .then(async (reponse) => {
      if (reponse.ok) await cache.put(requete, reponse.clone());
      return reponse;
    })
    .catch(() => garde ?? Response.error());
  return garde ?? reseau;
}

/** Une page = son chemin (sans paramètres) : /voyage/abc?x=1 et /voyage/abc partagent la même copie. */
const cleDePage = (url) => {
  const u = new URL(url);
  return `${u.origin}${u.pathname}`;
};

const avecDelai = (promesse, ms) =>
  Promise.race([promesse, new Promise((_, rejeter) => setTimeout(() => rejeter(new Error('délai')), ms))]);

/** Garde une page et les fichiers qu'elle charge (scripts, styles), pour qu'elle s'ouvre hors ligne. */
async function mettreEnCache(cache, url) {
  try {
    const reponse = await fetch(url, { credentials: 'same-origin' });
    if (!reponse.ok || reponse.redirected) return;
    const type = reponse.headers.get('Content-Type') ?? '';
    if (type.includes('text/html')) {
      const html = await reponse.clone().text();
      const fichiers = new Set([...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)].map((m) => m[1]));
      const cacheFichiers = await caches.open(FICHIERS);
      await Promise.all(
        [...fichiers].map(async (f) => {
          if (!(await cacheFichiers.match(f))) await cacheFichiers.add(f).catch(() => undefined);
        }),
      );
    }
    await cache.put(cleDePage(new URL(url, self.location.origin).href), reponse);
  } catch {
    // Hors ligne ou erreur : on réessaiera au prochain chargement.
  }
}

// L'application demande de garder les pages de ses voyages, pour pouvoir pointer hors ligne
// même dans un voyage pas encore ouvert sur cet appareil.
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'prechauffer' || !Array.isArray(event.data.urls)) return;
  const urls = event.data.urls.filter((u) => typeof u === 'string' && u.startsWith('/')).slice(0, 100);
  event.waitUntil(
    caches.open(PAGES).then(async (cache) => {
      for (const url of urls) await mettreEnCache(cache, url);
    }),
  );
});

const PAGE_HORS_LIGNE = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Hors connexion</title>
<style>body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px;
text-align:center;background:#f5f6fa;color:#1b1f2a}a{color:#0e7c86;font-weight:600}</style></head>
<body><div><p style="font-size:48px;margin:0">🩱</p><h1>Pas de connexion</h1>
<p>Cette page n’a pas encore été ouverte sur cet appareil.</p><p><a href="/">Revenir à mes voyages</a></p></div></body></html>`;
