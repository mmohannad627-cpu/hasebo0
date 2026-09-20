// Service Worker for HASEBO POS PWA & Offline Support
const CACHE_VERSION = '3.0.1';
const CACHE_NAME = `hasebo-pos-v${CACHE_VERSION}`;

const CORE_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.svg',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_FILES).catch((err) => {
        console.warn('[SW] فشل التخزين المسبق للملفات الأساسية:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const sameOrigin = url.origin === self.location.origin;
  const pathname = url.pathname;

  const isAPIRequest = sameOrigin && (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/system/')
  );

  const isNavigationRequest = event.request.mode === 'navigate';

  if (isAPIRequest) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            }).catch(() => {});
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  if (isNavigationRequest) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match('/index.html').then((m) => m || caches.match('/')))
    );
    return;
  }

  const isStaticAsset =
    sameOrigin &&
    (/\.(?:js|css|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|eot|otf|json)$/i.test(pathname) ||
      CORE_FILES.includes(pathname));

  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) {
          fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse.clone());
              }).catch(() => {});
            }
          }).catch(() => {});
          return cached;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            }).catch(() => {});
          }
          return networkResponse;
        }).catch(() => {
          return caches.match('/');
        });
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then((cached) => cached || caches.match('/'));
    })
  );
});
