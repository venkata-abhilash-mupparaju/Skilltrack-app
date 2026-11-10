// SkillTrack Service Worker with Web Push & Offline Support
const CACHE_NAME = 'skilltrack-cache-v1';
const OFFLINE_URL = '/offline.html';

const ASSETS_TO_CACHE = [
  '/',
  '/offline.html',
  '/manifest.webmanifest',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-maskable-192x192.png',
  '/icons/badge-72x72.png',
  '/icons/icon.svg',
];

// Install Event - Pre-cache core shell & offline page
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of ASSETS_TO_CACHE) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn('[SW] Could not pre-cache asset:', asset, err);
        }
      }
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Claim clients and remove stale caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[SW] Purging outdated cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Network first with offline fallback for navigation
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Ignore API requests and chrome extension requests
  if (url.pathname.startsWith('/api/') || url.protocol.startsWith('chrome-extension')) {
    return;
  }

  // Handle HTML navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedFallback = await cache.match(OFFLINE_URL);
        return cachedFallback || new Response('You are offline.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' },
        });
      })
    );
    return;
  }

  // Handle static assets with Stale-While-Revalidate or Network First
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to update cache
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        // Cache static images/icons
        if (url.pathname.startsWith('/icons/') || url.pathname.endsWith('.png') || url.pathname.endsWith('.svg')) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      });
    })
  );
});

// ==========================================
// Web Push Notification Event Handler
// ==========================================
self.addEventListener('push', (event) => {
  console.log('[SW] Push received from cloud scheduler:', event);

  let data = {
    title: 'SkillTrack Study Reminder',
    body: 'Time for your scheduled learning session!',
    url: '/schedule',
    type: 'reminder',
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch (e) {
      data.body = event.data.text() || data.body;
    }
  }

  const notificationOptions = {
    body: data.body,
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/badge-72x72.png',
    vibrate: [200, 100, 200, 100, 300],
    tag: data.tag || `skilltrack-${Date.now()}`,
    renotify: true,
    requireInteraction: true,
    data: {
      url: data.url || '/schedule',
      type: data.type,
      scheduleId: data.scheduleId,
      timestamp: Date.now(),
    },
    actions: [
      {
        action: 'open',
        title: 'Open Tracker',
      },
      {
        action: 'done',
        title: 'Check Off Task',
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, notificationOptions)
  );
});

// ==========================================
// Notification Click Event Handler
// ==========================================
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click action:', event.action);
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/';

  // Navigate to application page
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a SkillTrack window is already open, focus it and navigate
      for (let client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          return client.navigate(targetUrl);
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Subscription change handler (re-subscribe if expired by browser push service)
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] Push subscription expired. Re-subscribing...');
  event.waitUntil(
    self.registration.pushManager.subscribe(event.oldSubscription.options)
      .then((newSubscription) => {
        return fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: newSubscription,
            userAgent: navigator.userAgent,
          }),
        });
      })
      .catch((err) => {
        console.error('[SW] Failed to re-subscribe after expiration:', err);
      })
  );
});
