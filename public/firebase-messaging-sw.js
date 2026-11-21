importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAxbPlKJDRzXqkJcjD85wIn0Tdcc2WC7Fk",
  authDomain: "matdatesbjj.firebaseapp.com",
  projectId: "matdatesbjj",
  storageBucket: "matdatesbjj.firebasestorage.app",
  messagingSenderId: "207207897063",
  appId: "1:207207897063:web:8c744bd3a6d30d1e2e0f42"
});

const messaging = firebase.messaging();

function resolvePushTargetUrl(data) {
  const origin = self.location.origin || 'https://matdates.com';
  if (data && data.url && String(data.url).trim()) {
    const raw = String(data.url).trim();
    // If generic homepage URL was sent without query params, route straight into War Room!
    try {
      const parsed = new URL(raw, origin);
      if ((parsed.pathname === '/' || parsed.pathname === '') && !parsed.search) {
        if (data.view === 'trophy' && data.athleteName) {
          return origin + '/?athlete=' + encodeURIComponent(data.athleteName);
        }
        return origin + '/?warroom=1' + (data.athleteName ? '&watch=' + encodeURIComponent(data.athleteName) : '') + (data.eventId ? '&event=' + encodeURIComponent(data.eventId) : '');
      }
      return parsed.href;
    } catch {
      return raw;
    }
  }
  if (data && data.view === 'trophy' && data.athleteName) {
    return origin + '/?athlete=' + encodeURIComponent(data.athleteName);
  }
  const params = new URLSearchParams();
  params.set('warroom', '1');
  if (data && data.athleteName) params.set('watch', data.athleteName);
  if (data && data.eventId) params.set('event', data.eventId);
  return origin + '/?' + params.toString();
}

messaging.onBackgroundMessage((payload) => {
  if (payload && payload.notification) return;
  const data = (payload && payload.data) || {};
  const title = data.title || 'MatDates Live Mat Alert';
  const body = data.body || 'Mat & match time updated!';
  const targetUrl = resolvePushTargetUrl(data);
  self.registration.showNotification(title, {
    body,
    icon: '/apple-touch-icon.png',
    badge: '/mat-icon.png',
    tag: data.tag || 'matdates-live-alert',
    data: {
      url: targetUrl,
      athleteName: data.athleteName || '',
      eventId: data.eventId || '',
      view: data.view || 'warroom'
    }
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const nData = (event.notification && event.notification.data) || {};
  const target = resolvePushTargetUrl(nData);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        try {
          const cUrl = new URL(client.url);
          const tUrl = new URL(target, self.location.origin);
          if (cUrl.origin === tUrl.origin && 'focus' in client) {
            client.postMessage({
              type: 'MD_PUSH_DEEPLINK',
              url: tUrl.href,
              search: tUrl.search,
              athleteName: nData.athleteName || '',
              eventId: nData.eventId || '',
              view: nData.view || 'warroom'
            });
            return client.focus();
          }
        } catch {}
      }
      if (clients.openWindow) return clients.openWindow(target);
    })
  );
});
