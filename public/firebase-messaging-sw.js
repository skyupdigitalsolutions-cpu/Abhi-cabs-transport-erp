// public/firebase-messaging-sw.js
//
// Handles a push notification that arrives while no ERP tab is focused.
// This file MUST live at the site root for its scope to cover the whole
// origin — that's a Firebase/browser requirement, not a project convention.
//
// IMPORTANT: this is a plain script, not a module, and can't read Vite's
// import.meta.env — the config values below are intentionally duplicated
// from your .env's VITE_FIREBASE_* values. Update both places if they change.

importScripts("https://www.gstatic.com/firebasejs/11.0.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.0.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "REPLACE_WITH_VITE_FIREBASE_API_KEY",
  authDomain: "REPLACE_WITH_VITE_FIREBASE_AUTH_DOMAIN",
  projectId: "REPLACE_WITH_VITE_FIREBASE_PROJECT_ID",
  messagingSenderId: "REPLACE_WITH_VITE_FIREBASE_MESSAGING_SENDER_ID",
  appId: "REPLACE_WITH_VITE_FIREBASE_APP_ID",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || "ABHI CABS ERP", {
    body: body || "",
    icon: "/logo-192.png", // add a real icon at this path, or change this line
    data: payload.data || {},
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((list) => {
      for (const client of list) {
        if ("focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow("/admin/notifications");
    })
  );
});
