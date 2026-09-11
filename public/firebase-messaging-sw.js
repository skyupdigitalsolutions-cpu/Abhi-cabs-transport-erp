// public/firebase-messaging-sw.js
//
// Firebase Cloud Messaging background push handler.
// This file is registered only when VITE_FIREBASE_* env vars are configured.
// Until then it exits immediately so it never intercepts network requests
// or throws "Failed to fetch" errors in the console.

// Guard: if Firebase isn't configured (placeholder values), do nothing.
// The service worker still installs so the browser doesn't throw a
// registration error, but it has zero effect on the app.
const API_KEY = 'REPLACE_WITH_VITE_FIREBASE_API_KEY';
if (!API_KEY || API_KEY.startsWith('REPLACE_')) {
  // No-op SW — Firebase not configured yet.
  // Remove this guard and fill in real values from your Firebase console
  // and .env file when you're ready to enable push notifications.
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', () => {});
  // Do NOT add a fetch handler — we must not intercept any requests.
} else {
  importScripts('https://www.gstatic.com/firebasejs/11.0.2/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/11.0.2/firebase-messaging-compat.js');

  firebase.initializeApp({
    apiKey:            API_KEY,
    authDomain:        'REPLACE_WITH_VITE_FIREBASE_AUTH_DOMAIN',
    projectId:         'REPLACE_WITH_VITE_FIREBASE_PROJECT_ID',
    messagingSenderId: 'REPLACE_WITH_VITE_FIREBASE_MESSAGING_SENDER_ID',
    appId:             'REPLACE_WITH_VITE_FIREBASE_APP_ID',
  });

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const { title, body } = payload.notification || {};
    self.registration.showNotification(title || 'ABHI CABS ERP', {
      body: body || '',
      icon: '/logo-192.png',
      data: payload.data || {},
    });
  });

  self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((list) => {
        for (const client of list) {
          if ('focus' in client) return client.focus();
        }
        if (clients.openWindow) return clients.openWindow('/admin/notifications');
      })
    );
  });
}
