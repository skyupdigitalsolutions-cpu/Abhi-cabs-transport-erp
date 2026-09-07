// Firebase Cloud Messaging — web push notifications for admin/staff.
//
// This only activates once real Firebase project config is set in .env
// (VITE_FIREBASE_*). Until then, requestNotificationPermission() resolves
// to null — the ERP works completely normally without it, push is simply
// not offered, matching the same non-blocking pattern used on the
// customer website.
import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { apiClient } from '../services/apiClient';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

function isConfigured() {
  return !!(firebaseConfig.apiKey && firebaseConfig.projectId && VAPID_KEY);
}

let appInstance = null;
function getFirebaseApp() {
  if (!isConfigured()) return null;
  if (getApps().length) return getApps()[0];
  if (!appInstance) appInstance = initializeApp(firebaseConfig);
  return appInstance;
}

/**
 * Asks the browser for notification permission, registers the service
 * worker, gets an FCM token, and sends it to the real backend
 * (POST /admin/notifications/push-tokens). Call this right after a
 * successful admin/staff login.
 * Returns the token on success, or null if push isn't available/configured/
 * permitted — every case handled quietly, never thrown.
 */
export async function requestNotificationPermission() {
  if (typeof window === 'undefined') return null;
  if (!isConfigured()) return null;
  if (!(await isSupported().catch(() => false))) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const app = getFirebaseApp();
    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
    if (!token) return null;

    await apiClient.post('/admin/notifications/push-tokens', { token, platform: 'WEB' }).catch(() => {
      // Registration failing shouldn't surface anywhere loud — the push
      // simply won't arrive; everything else keeps working normally.
    });
    return token;
  } catch {
    return null;
  }
}

/**
 * Listens for a push that arrives while this tab is open and focused.
 * Returns an unsubscribe function; call it in a useEffect cleanup.
 */
export function onForegroundMessage(callback) {
  const app = getFirebaseApp();
  if (!app) return () => {};
  const messaging = getMessaging(app);
  return onMessage(messaging, callback);
}
