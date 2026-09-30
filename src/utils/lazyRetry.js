/**
 * lazyRetry – drop-in replacement for React.lazy() that handles
 * "Failed to fetch dynamically imported module" errors after a deploy.
 *
 * When Vite builds new hashed chunks and you deploy, users with a stale
 * index.html still reference old chunk filenames that no longer exist.
 * This wrapper catches that specific error and does a one-time full page
 * reload so the browser fetches the new index.html (and its new chunk refs).
 *
 * Usage:
 *   const Drivers = lazyRetry(() => import('../pages/admin/Drivers'));
 */
import { lazy } from 'react';

const RETRY_KEY = 'chunk-reload-retry';

export default function lazyRetry(importFn) {
  return lazy(() =>
    importFn().catch((error) => {
      const isChunkError =
        error.message?.includes('Failed to fetch dynamically imported module') ||
        error.message?.includes('Loading chunk') ||
        error.message?.includes('Loading CSS chunk') ||
        error.name === 'ChunkLoadError';

      if (isChunkError) {
        // Avoid infinite reload loops: only reload once per session
        const hasRetried = sessionStorage.getItem(RETRY_KEY);
        if (!hasRetried) {
          sessionStorage.setItem(RETRY_KEY, '1');
          window.location.reload();
          // Return a never-resolving promise so React doesn't try to render
          // while the browser is reloading
          return new Promise(() => {});
        }
        // Already retried once — clear flag and let ErrorBoundary handle it
        sessionStorage.removeItem(RETRY_KEY);
      }

      throw error;
    })
  );
}
