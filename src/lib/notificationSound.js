/**
 * src/lib/notificationSound.js
 *
 * A short, synthesized "ping" for incoming realtime events — no audio file
 * to host, fetch, or have fail to load; the Web Audio API generates the
 * tone directly in the browser. Nothing in this codebase played any sound
 * before this (confirmed — no <audio>, no .play() call, anywhere).
 *
 * One AudioContext is reused rather than created per-ping — browsers cap
 * how many can exist, and creating one is not free.
 *
 * Autoplay note: browsers only allow audio after a user gesture on the
 * page (a click, a keypress). By the time an admin reaches the dashboard
 * they've already submitted the login form, which counts — but if a tab
 * has been open and untouched since before that, the very first ping in a
 * session can be silently blocked by the browser. This is a browser
 * security policy, not a bug here, and it fails silently by design: a
 * blocked beep must never throw or show an error over something this
 * minor.
 */

let ctx = null;

function getContext() {
  if (ctx) return ctx;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  ctx = new AudioCtx();
  return ctx;
}

export function playNotificationSound() {
  try {
    const audioCtx = getContext();
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});

    const now = audioCtx.currentTime;
    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    // A short two-tone "ping" — up then down — rather than a single flat
    // beep, so it reads as a notification rather than an alarm/error tone.
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, now);
    oscillator.frequency.setValueAtTime(1108, now + 0.09);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    oscillator.connect(gain);
    gain.connect(audioCtx.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.24);
  } catch {
    // Never let a sound failure surface to the user — it's a nice-to-have,
    // not a functional part of the notification (the toast/badge still work).
  }
}
