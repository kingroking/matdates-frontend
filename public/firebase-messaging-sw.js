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

messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const title = (payload.notification && payload.notification.title) || data.title || 'MatDates Live Mat Alert';
  const body = (payload.notification && payload.notification.body) || data.body || 'Mat & match time updated!';
  self.registration.showNotification(title, {
    body,
    icon: '/mat-icon.png',
    badge: '/mat-icon.png',
    data: { url: data.url || 'https://matdates.com' }
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || 'https://matdates.com';
  event.waitUntil(clients.openWindow(target));
});
