// Service Worker for Advocate Case Reminder PWA
// Version 1.0.0

const CACHE_NAME = 'advocate-case-v1';
const RUNTIME_CACHE = 'advocate-runtime-v1';

// Files to cache immediately on install
const PRECACHE_URLS = [
  '/',
  '/templates/index.html',
  '/templates/login.html',
  '/templates/dashboard.html',
  '/static-css/style.css', // Update this to your actual CSS filename
  '/static-js/dashboard.js',
  '/manifest.json',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png',
];

// Install event - cache critical files
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching app shell');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // API requests - Network First strategy
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/cases')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets - Cache First strategy
  event.respondWith(cacheFirst(request));
});

// Cache First Strategy (for static assets)
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  
  if (cached) {
    console.log('[SW] Serving from cache:', request.url);
    return cached;
  }

  try {
    const response = await fetch(request);
    
    if (response.status === 200) {
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('[SW] Fetch failed:', error);
    throw error;
  }
}

// Network First Strategy (for API calls)
async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);

  try {
    const response = await fetch(request);
    
    if (response.status === 200) {
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    
    throw error;
  }
}

// Push Notification event
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  let notificationData = {
    title: 'Case Reminder',
    body: 'You have a case due soon',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    tag: 'case-reminder',
    requireInteraction: true,
    vibrate: [200, 100, 200],
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        tag: data.tag || notificationData.tag,
        data: data.data || {},
        requireInteraction: true,
        vibrate: [200, 100, 200],
        actions: [
          {
            action: 'view',
            title: 'View Case',
          },
          {
            action: 'dismiss',
            title: 'Dismiss',
          }
        ]
      };
    } catch (error) {
      console.error('[SW] Error parsing push data:', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);

  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/templates/dashboard.html')
    );
  } else if (event.action === 'dismiss') {
    return;
  } else {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          for (let client of clientList) {
            if (client.url.includes('/dashboard.html') && 'focus' in client) {
              return client.focus();
            }
          }
          
          if (clients.openWindow) {
            return clients.openWindow('/templates/dashboard.html');
          }
        })
    );
  }
});

// Background sync event
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);

  if (event.tag === 'sync-cases') {
    event.waitUntil(syncCases());
  }
});

async function syncCases() {
  try {
    console.log('[SW] Syncing offline data...');
    return Promise.resolve();
  } catch (error) {
    console.error('[SW] Sync failed:', error);
    throw error;
  }
}

// Message event
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Error handlers
self.addEventListener('error', (event) => {
  console.error('[SW] Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled rejection:', event.reason);
});