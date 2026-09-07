/**
 * Admin/staff notifications — real endpoint: /api/v1/admin/notifications
 * (same router also serves /notifications for the customer app — a
 * notification always belongs to whoever's logged in, see the backend's
 * notification.routes.js comment for why one router covers both mounts).
 *
 * Real response shape (src/services/notification.service.js's list()):
 *   { items: [...], unreadCount, pagination: { page, limit, total, totalPages } }
 * This is deliberately NOT run through the generic crudFactory — the extra
 * unreadCount field and the mark-read/mark-all-read actions don't fit that
 * generic shape.
 */
import { apiClient } from './apiClient';

export const notificationsService = {
  async list(params = {}) {
    const data = await apiClient.get('/admin/notifications', { params });
    return { data: data.items || [], unreadCount: data.unreadCount || 0, meta: data.pagination };
  },
  async markRead(id) {
    const data = await apiClient.patch(`/admin/notifications/${id}/read`, {});
    return data.notification || data;
  },
  async markAllRead() {
    return apiClient.patch('/admin/notifications/read-all', {});
  },
  async registerPushToken(token, platform = 'WEB') {
    return apiClient.post('/admin/notifications/push-tokens', { token, platform });
  },
};
