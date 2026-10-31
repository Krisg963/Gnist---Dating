/* global self, clients */

self.addEventListener('push', (event) => {
  let payload = {
    title: 'Gnist',
    body: 'Du har en ny oppdatering i Gnist.',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: 'gnist-push',
    data: { tab: 'messages', matchId: null, url: '/' },
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = {
        ...payload,
        ...parsed,
        data: {
          ...payload.data,
          ...(parsed.data || {}),
        },
      };
    } catch {
      payload.body = event.data.text() || payload.body;
    }
  }

  const options = {
    body: payload.body,
    icon: payload.icon || '/pwa-192x192.png',
    badge: payload.badge || '/pwa-192x192.png',
    tag: payload.tag || 'gnist-notification',
    renotify: true,
    vibrate: [120, 60, 120],
    data: payload.data,
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetData = event.notification.data || { tab: 'messages', url: '/' };

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if ('focus' in client) {
            client.focus();
            client.postMessage({
              type: 'GNIST_PUSH_CLICK',
              payload: targetData,
            });
            return;
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetData.url || '/');
        }
      })
  );
});
