self.addEventListener('push', (event) => {
  const payload = (() => {
    if (!event.data) {
      return {};
    }
    try {
      return event.data.json();
    } catch {
      return {};
    }
  })();

  const title = String(payload.title || 'Event Manager');
  const body = String(payload.message || 'You have a new notification.');
  const link = String(payload.link || '/');
  const notificationId = payload.notificationId ? String(payload.notificationId) : null;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: {
        link,
        notificationId,
      },
      vibrate: [120, 40, 120],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const rawLink = event.notification?.data?.link;
  const link = typeof rawLink === 'string' && rawLink.trim() ? rawLink : '/';
  const notificationId = event.notification?.data?.notificationId;
  const resolvedUrl = new URL(link, self.location.origin).toString();

  event.waitUntil((async () => {
    const openClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of openClients) {
      if ('focus' in client) {
        await client.focus();
      }
      if ('navigate' in client) {
        await client.navigate(resolvedUrl);
      }
      break;
    }

    if (openClients.length === 0) {
      await clients.openWindow(resolvedUrl);
    }

    if (notificationId) {
      fetch(`/api/v1/notifications/${encodeURIComponent(String(notificationId))}/read`, {
        method: 'PUT',
        credentials: 'include',
      }).catch(() => {
        // Best effort only.
      });
    }
  })());
});
