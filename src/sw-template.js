
import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, NetworkFirst, CacheFirst, NetworkOnly } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

clientsClaim();

self.skipWaiting();

precacheAndRoute(self.__WB_MANIFEST || []);

const bgSyncPlugin = new BackgroundSyncPlugin('checkins-queue', {
  maxRetentionTime: 24 * 60, // 24時間（分単位）
  onSync: async ({ queue }) => {
    try {
      await queue.replayRequests();
      
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) {
        client.postMessage({ type: 'SYNC_COMPLETED' });
      }
    } catch (error) {
      console.error('Background sync failed:', error);
    }
  }
});

registerRoute(
  /\/api\/checkins/,
  new NetworkOnly({
    plugins: [bgSyncPlugin],
  }),
  'POST'
);

registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'app-shell-v1',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7日間
      }),
    ],
    networkTimeoutSeconds: 10,
    async fetchOptions() {
      try {
        return {
          credentials: 'same-origin',
        };
      } catch (error) {
        return {};
      }
    },
    async handlerDidError() {
      const cache = await self.caches.open('app-shell-v1');
      return await cache.match('/offline.html') || Response.error();
    },
  })
);

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-checkins') {
    console.log('Background Sync: チェックインデータの同期を開始します');
    event.waitUntil(
      (async () => {
        try {
          const clients = await self.clients.matchAll({ type: 'window' });
          for (const client of clients) {
            client.postMessage({ type: 'SYNC_STARTED' });
          }
          
          await bgSyncPlugin.onSync({ queue: bgSyncPlugin.queue });
        } catch (error) {
          console.error('Background Sync failed:', error);
        }
      })()
    );
  }
});

self.addEventListener('push', (event) => {
  const data = event.data.json();
  const options = {
    body: data.body || 'チェックインデータが更新されました',
    icon: '/icons/icon.svg',
    badge: '/icons/icon.svg',
    tag: 'checkin-update',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
    },
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title || 'Bullshit Checkin',
      options
    )
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});
