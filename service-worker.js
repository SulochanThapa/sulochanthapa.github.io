// Service Worker for efficient caching
const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `sulochanthapa-cache-${CACHE_VERSION}`;

// Define cache durations (in seconds)
const CACHE_DURATIONS = {
  images: 31536000,      // 1 year for images
  styles: 31536000,      // 1 year for CSS
  scripts: 31536000,     // 1 year for JS
  fonts: 31536000,       // 1 year for fonts
  documents: 86400,      // 1 day for HTML pages
  api: 300               // 5 minutes for API calls
};

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/assets/css/main.css',
  '/assets/images/cd_logo.svg',
  '/assets/images/sulochan-thapa.webp',
  '/manifest.webmanifest'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome extensions and other protocols
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Skip external ad domains (don't cache ads)
  if (url.hostname.includes('googlesyndication.com') || 
      url.hostname.includes('doubleclick.net') ||
      url.hostname.includes('googletagmanager.com') ||
      url.hostname.includes('google-analytics.com')) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(request).then((cachedResponse) => {
        
        // If we have a cached response, check if it's still fresh
        if (cachedResponse) {
          const cachedTime = new Date(cachedResponse.headers.get('sw-cached-time'));
          const now = new Date();
          const age = (now - cachedTime) / 1000; // age in seconds
          
          const maxAge = getMaxAge(url);
          
          // If cache is still fresh, return it
          if (age < maxAge) {
            console.log('[Service Worker] Serving from cache:', url.pathname);
            return cachedResponse;
          }
        }

        // Fetch from network
        return fetch(request).then((networkResponse) => {
          // Don't cache if not successful
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'error') {
            return networkResponse;
          }

          // Clone the response
          const responseToCache = networkResponse.clone();

          // Add custom header to track cache time
          const headers = new Headers(responseToCache.headers);
          headers.append('sw-cached-time', new Date().toISOString());

          const newResponse = new Response(responseToCache.body, {
            status: responseToCache.status,
            statusText: responseToCache.statusText,
            headers: headers
          });

          // Cache the new response
          cache.put(request, newResponse);
          console.log('[Service Worker] Cached new response:', url.pathname);

          return networkResponse;
        }).catch(() => {
          // If network fails and we have a cached version (even if stale), use it
          if (cachedResponse) {
            console.log('[Service Worker] Network failed, serving stale cache:', url.pathname);
            return cachedResponse;
          }
          
          // If it's an HTML page, return offline page
          if (request.headers.get('accept').includes('text/html')) {
            return new Response('<h1>Offline</h1><p>You are currently offline.</p>', {
              headers: { 'Content-Type': 'text/html' }
            });
          }
        });
      });
    })
  );
});

// Determine cache duration based on file type
function getMaxAge(url) {
  const pathname = url.pathname.toLowerCase();
  
  // Images
  if (pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico|bmp)$/)) {
    return CACHE_DURATIONS.images;
  }
  
  // Stylesheets
  if (pathname.match(/\.css$/)) {
    return CACHE_DURATIONS.styles;
  }
  
  // Scripts
  if (pathname.match(/\.js$/)) {
    return CACHE_DURATIONS.scripts;
  }
  
  // Fonts
  if (pathname.match(/\.(woff|woff2|ttf|eot|otf)$/)) {
    return CACHE_DURATIONS.fonts;
  }
  
  // HTML documents
  if (pathname.match(/\.(html|htm)$/) || pathname === '/' || !pathname.includes('.')) {
    return CACHE_DURATIONS.documents;
  }
  
  // Default
  return CACHE_DURATIONS.documents;
}

// Listen for messages from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            return caches.delete(cacheName);
          })
        );
      })
    );
  }
});
