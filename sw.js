const CACHE_NAME = 'cashback-beta-2025.04.27-r5';
const ASSETS = ['./index.html', './style.css', './manifest.json', './icon-192.png'];

// Install: cache all assets
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

// Activate: remove old caches, claim clients immediately
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

// Listen for messages from main page
self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting();
  if (e.data === 'getVersion') {
    e.source.postMessage({ version: 'β' + CACHE_NAME.replace('cashback-beta-', '') });
  }
});

// Fetch: network-first for HTML (always check for updates), cache-first for others
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

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
