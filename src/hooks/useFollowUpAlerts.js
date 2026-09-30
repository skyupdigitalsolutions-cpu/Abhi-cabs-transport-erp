/**
 * useFollowUpAlerts — background watcher for booking follow-up reminders.
 *
 * Runs every 30 seconds while the admin panel is open. When a follow-up
 * datetime arrives:
 *   1. Fires an in-app toast (always works)
 *   2. Sends a browser Notification (if permission granted)
 *   3. Plays a short chime (audio ping)
 *   4. Marks it as "fired" so it doesn't repeat
 *
 * Also exposes `dueFollowUps` — a live count of overdue items for the
 * navbar bell badge.
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { useToast } from './useToast';

const STORAGE_KEY = 'abhi_booking_notes';
const FIRED_KEY   = 'abhi_followup_fired';
const CHECK_INTERVAL = 30_000; // 30 seconds

/** Read all stored booking notes that have a follow-up. */
function getFollowUps() {
  try {
    const raw = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
    return Object.entries(raw)
      .filter(([, v]) => v.followUp)
      .map(([bookingId, v]) => ({ bookingId, ...v }));
  } catch { return []; }
}

/** IDs we've already fired a notification for in this session. */
function getFired() {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(FIRED_KEY) || '[]'));
  } catch { return new Set(); }
}

function markFired(bookingId) {
  const fired = getFired();
  fired.add(bookingId);
  sessionStorage.setItem(FIRED_KEY, JSON.stringify([...fired]));
}

/** Request browser notification permission on first call. */
function ensureNotificationPermission() {
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
  }
}

/** Send a browser push notification. */
function sendBrowserNotification(title, body) {
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try {
      const n = new Notification(title, {
        body,
        icon: '/favicon.svg',
        tag: 'followup-' + Date.now(),
        requireInteraction: true,
      });
      // Click → focus the tab and go to bookings
      n.onclick = () => {
        window.focus();
        window.location.hash = '';
        if (!window.location.pathname.includes('/admin/bookings')) {
          window.location.href = '/admin/bookings';
        }
        n.close();
      };
    } catch { /* notifications not supported */ }
  }
}

/** Play a short notification chime. */
function playChime() {
  try {
    // Generate a short two-tone chime using Web Audio API
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const playTone = (freq, startTime, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    const now = ctx.currentTime;
    playTone(880, now, 0.15);        // A5
    playTone(1108.73, now + 0.15, 0.2); // C#6
    // Clean up
    setTimeout(() => ctx.close(), 1000);
  } catch { /* audio not available */ }
}

export default function useFollowUpAlerts() {
  const toast = useToast();
  const [dueCount, setDueCount] = useState(0);
  const lastCheckRef = useRef(0);

  const checkFollowUps = useCallback(() => {
    const now = new Date();
    const followUps = getFollowUps();
    const fired = getFired();
    let due = 0;

    for (const fu of followUps) {
      const fuTime = new Date(fu.followUp);
      if (fuTime <= now) {
        due++;
        // Fire notification only once per follow-up
        if (!fired.has(fu.bookingId)) {
          markFired(fu.bookingId);

          const timeStr = fuTime.toLocaleTimeString('en-IN', {
            hour: '2-digit', minute: '2-digit', hour12: true,
          });
          const dateStr = fuTime.toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short',
          });

          // In-app toast
          toast.info(
            `📞 Follow-up due now — call back for booking. Scheduled: ${dateStr} ${timeStr}`,
          );

          // Browser notification
          sendBrowserNotification(
            '📞 Follow-up reminder',
            `Time to call back the customer. Scheduled: ${dateStr} at ${timeStr}`,
          );

          // Audio chime
          playChime();
        }
      }
    }

    setDueCount(due);
  }, [toast]);

  useEffect(() => {
    // Ask for notification permission early
    ensureNotificationPermission();

    // Initial check
    checkFollowUps();

    // Poll every 30 seconds
    const interval = setInterval(checkFollowUps, CHECK_INTERVAL);

    // Also check when the tab regains focus (user switches back)
    const onFocus = () => checkFollowUps();
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [checkFollowUps]);

  return { dueCount };
}
