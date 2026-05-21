// ============================================================
// ENLACE EDITORIAL — SERVICE WORKER
// Permite que la app funcione SIN INTERNET (offline)
// ============================================================

const CACHE_NAME = 'enlace-editorial-v1';
const ARCHIVOS_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// ── INSTALACIÓN: guardar archivos en caché ──────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Enlace Editorial...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Archivos cacheados para uso offline');
        return cache.addAll(ARCHIVOS_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVACIÓN: limpiar cachés viejas ──────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: servir desde caché si no hay internet ───────────
self.addEventListener('fetch', (event) => {
  // Llamadas a la API del backend → siempre intentar red primero
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(res => res)
        .catch(() => new Response(
          JSON.stringify({ error: 'Sin conexión. Los datos se guardarán localmente.' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        ))
    );
    return;
  }

  // Resto (HTML, iconos, etc.) → caché primero, red como respaldo
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request)
        .then(res => {
          // Guardar en caché para la próxima vez
          const copia = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, copia));
          return res;
        })
      )
  );
});

// ── SYNC en segundo plano (cuando vuelve el internet) ──────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pedidos') {
    event.waitUntil(sincronizarPedidosPendientes());
  }
});

async function sincronizarPedidosPendientes() {
  // En la versión con backend: tomar pedidos guardados offline
  // y enviarlos al servidor cuando regrese la conexión
  console.log('[SW] Sincronizando pedidos pendientes...');
}

// ── PUSH NOTIFICATIONS (futuro) ────────────────────────────
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  self.registration.showNotification('Enlace Editorial', {
    body: data.mensaje || 'Tienes una notificación',
    icon: '/icon-192.png',
    badge: '/icon-192.png'
  });
});
