import { useState, useCallback } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import Pagination from '../../components/ui/Pagination';
import { useApi } from '../../hooks/useApi';
import { notificationsService } from '../../services';
import { timeAgo } from '../../utils/formatters';

export default function Notifications() {
  const [page, setPage] = useState(1);
  const fetchPage = useCallback(() => notificationsService.list({ page, limit: 20 }), [page]);
  const { data, status, error, refetch } = useApi(fetchPage, [page]);
  const [markingAll, setMarkingAll] = useState(false);

  const rows = data?.data || [];
  const unreadCount = data?.unreadCount ?? 0;

  const handleMarkRead = async (id) => {
    try {
      await notificationsService.markRead(id);
      refetch();
    } catch { /* non-critical — the item just stays unread visually */ }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await notificationsService.markAllRead();
      refetch();
    } finally {
      setMarkingAll(false);
    }
  };

  if (status === 'loading') return <LoadingState label="Loading notifications…" />;
  if (status === 'error')   return <ErrorState message={error?.message} onRetry={refetch} />;

  return (
    <div>
      <PageHeader
        title="Notifications"
        description={unreadCount > 0 ? `${unreadCount} unread` : "System updates across bookings, trips and payments."}
        actions={
          <Button variant="secondary" size="sm" icon={CheckCheck} loading={markingAll} disabled={unreadCount === 0} onClick={handleMarkAllRead}>
            Mark all as read
          </Button>
        }
      />
      {rows.length === 0 ? (
        <Card><EmptyState icon={Bell} title="You're all caught up" /></Card>
      ) : (
        <>
          <Card padded={false}>
            <div>
              {rows.map((n, i) => (
                <button
                  key={n.id}
                  onClick={() => !n.isRead && handleMarkRead(n.id)}
                  className="w-full text-left flex items-start gap-3 px-5 py-3.5 focus-ring"
                  style={{
                    borderBottom: i < rows.length - 1 ? '1px solid #F7F8FC' : 'none',
                    backgroundColor: !n.isRead ? '#f0f4ff' : 'transparent',
                  }}
                >
                  <span
                    className="h-2 w-2 rounded-full mt-1.5 shrink-0"
                    style={{ backgroundColor: n.isRead ? '#E5E7EB' : '#3B65DB' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: '#1F2937' }}>{n.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{n.body}</p>
                  </div>
                  <span className="text-xs shrink-0" style={{ color: '#6B7280' }}>{timeAgo(n.createdAt)}</span>
                </button>
              ))}
            </div>
          </Card>
          {data?.meta?.totalPages > 1 && (
            <div className="mt-4">
              <Pagination page={page} totalPages={data.meta.totalPages} onChange={setPage} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
