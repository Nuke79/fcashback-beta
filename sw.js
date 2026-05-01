const CACHE_NAME = 'cashback-beta-2026.04.30-r7';
const ASSETS = ['./index.html', './style.css', './app.js', './manifest.json', './icon-192.png'];

// Install: cache all assets — but DON'T auto-activate (wait for page command)
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  // No self.skipWaiting() — stay in 'waiting' state
});

// Activate: remove old caches — but DON'T auto-claim (page reloads via controllerchange)
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  // No self.clients.claim() — page will reload via controllerchange listener
});

// Listen for messages from main page
self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting();
  if (e.data === 'getVersion') {
    e.source.postMessage({ version: CACHE_NAME.replace('cashback-', '') });
  }
});

// Fetch: network-first for HTML (always check for updates), cache-first for others
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // version.json: always network, never cache
  if (url.pathname.endsWith('version.json')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // HTML file: always try network first to get updates
  if (url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname.endsWith('/')) {
    e.respondWith(
      fetch(e.request)
        .then(resp => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          }
          return resp;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Other assets: try cache first, fall back to network
  e.respondWith(
    caches.match(e.request).then(r => {
      if (r) return r;
      return fetch(e.request).then(resp => {
        if (resp.ok) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return resp;
      });
    })
  );
});
