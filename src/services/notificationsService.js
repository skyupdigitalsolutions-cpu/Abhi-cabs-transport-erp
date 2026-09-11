/**
 * Admin notifications — /api/v1/admin/notifications does NOT exist on the
 * backend (confirmed: no notification routes are mounted in routes/index.js).
 *
 * All methods use the mock store directly (mockOnly pattern) so the
 * Notifications page and the Navbar bell badge never hit the network or show
 * a 404. Remove the mock logic and point back to apiClient once the backend
 * team adds the real route.
 */
import * as db from './mockDb';
import { mockResolve } from './mockUtils';

export const notificationsService = {
  async list(params = {}) {
    const { page = 1, limit = 20 } = params;
    const all    = [...db.notifications].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const start  = (page - 1) * limit;
    const items  = all.slice(start, start + limit);
    const unread = all.filter(n => !n.read).length;
    return {
      data:        items,
      unreadCount: unread,
      meta: {
        page,
        limit,
        total:      all.length,
        totalPages: Math.ceil(all.length / limit),
      },
    };
  },

  async markRead(id) {
    const n = db.notifications.find(n => n.id === id);
    if (n) n.read = true;
    return mockResolve(n || { id });
  },

  async markAllRead() {
    db.notifications.forEach(n => { n.read = true; });
    return mockResolve({ success: true });
  },

  async registerPushToken(_token, _platform = 'WEB') {
    // No-op in mock mode — token registration needs a real backend endpoint
    return mockResolve({ success: true });
  },
};
