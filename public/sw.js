const CACHE_NAME = 'kimi-chat-pwa-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/App.tsx',
  '/src/css/app.css',
  '/src/css/variables.css',
  '/favicon.svg'
];

// Install Event - Cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Only cache GET requests (exclude Supabase and NVIDIA API calls)
  if (event.request.method !== 'GET' || event.request.url.includes('/v1/chat') || event.request.url.includes('supabase.co')) {
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache clone
        const resClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, resClone);
        });
        return response;
      })
      .catch(() => caches.match(event.request).then((res) => res || fetch(event.request)))
  );
});

// Handle messages from the client (e.g. show background notifications)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'TRIGGER_NOTIFICATION') {
    self.registration.showNotification(event.data.title, {
      body: event.data.body,
      icon: '/favicon.svg',
      vibrate: [200, 100, 200],
      data: { url: '/' }
    });
  }
});

// Handle Web Push Notifications (if configured in future via Supabase)
self.addEventListener('push', (event) => {
  let title = 'Notificación de Kimi';
  let body = '¡Tienes una nueva alerta!';
  
  if (event.data) {
    try {
      const payload = event.data.json();
      title = payload.title || title;
      body = payload.body || body;
    } catch (e) {
      body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body: body,
      icon: '/favicon.svg',
      vibrate: [200, 100, 200],
      badge: '/favicon.svg'
    })
  );
});

// Handle Notification Clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing tab if open
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new tab
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
