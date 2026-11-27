/**
 * sw.js — Service Worker de Mi Espacio
 * Cachea el App Shell para funcionamiento offline en Android / iOS / Desktop.
 */

const CACHE_NAME = 'mi-espacio-v70';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './landing.css',
  './communicator.css',
  './family.css',
  './app.js',
  './dataService.js',
  './firebaseConfig.js',
  './musicCatalog.js',
  './seniorServices.js',
  './speech.js',
  './voiceAssistant.js',
  './assets/cards/asistente-voz.svg',
  './manifest.json',
  './icons/logo-192.png',
  './icons/logo-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) return;
  // Nunca interceptar peticiones externas (radios en vivo, Open-Meteo, Firebase, etc.)
  const reqUrl = new URL(event.request.url);
  if (reqUrl.origin !== self.location.origin) return;
  // No interceptar archivos de audio MP3 en caché de App Shell (se reproducen bajo demanda)
  if (reqUrl.pathname.endsWith('.mp3')) return;

  // Network-first: siempre busca la versión más reciente online y usa caché si no hay internet
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((c) => c || caches.match('./index.html')))
  );
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { notification: { title: 'Mi Espacio', body: event.data?.text() || 'Nuevo aviso' } };
  }

  const title = payload.notification?.title || payload.data?.title || '💬 Mi Espacio';
  const body = payload.notification?.body || payload.data?.body || 'Tenés un nuevo aviso';
  const url = payload.data?.url || './';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: './icons/logo-192.png',
      badge: './icons/logo-192.png',
      tag: 'mi-espacio-push',
      renotify: true,
      requireInteraction: true,
      silent: false,
      vibrate: [200, 100, 200, 100, 300],
      actions: [
        { action: 'open', title: '📲 Abrir y responder' }
      ],
      data: { url }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || './';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      if (clients.length > 0) {
        return clients[0].focus();
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
