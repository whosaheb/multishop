import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { NotificationItem } from '@/types/domain';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export default function NotificationsModal({ isOpen, onClose, onUpdated }: Props) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await api.get<NotificationItem[]>('/notifications');
      setNotifications(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: 'READ' } : n)),
      );
      onUpdated();
    } catch (e) {
      console.error(e);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, status: 'READ' })));
      onUpdated();
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="notifications-backdrop"
      className="fixed inset-0 z-50 flex items-end sm:items-start justify-center sm:justify-end bg-black/60 p-0 sm:p-6"
      onClick={onClose}
    >
      <div
        id="notifications-panel"
        className="w-full max-w-md rounded-t-3xl sm:rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag handle indicator */}
        <div className="flex justify-center pt-2 sm:hidden">
          <div className="h-1.5 w-12 rounded-full bg-slate-700/80" />
        </div>

        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex items-center space-x-2">
            <h3 className="font-bold text-slate-100 text-base">Notifications</h3>
            {notifications.filter((n) => n.status === 'UNREAD').length > 0 && (
              <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs font-semibold text-indigo-400">
                {notifications.filter((n) => n.status === 'UNREAD').length} unread
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              id="mark-all-read-btn"
              onClick={markAllAsRead}
              className="min-h-[36px] px-2 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              Mark all read
            </button>
            <button
              id="close-notifications-btn"
              onClick={onClose}
              className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-y-auto divide-y divide-slate-800/60 p-3 space-y-1">
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-500">Loading alerts...</p>
          ) : notifications.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">No notifications</p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                id={`notification-item-${n.id}`}
                className={`p-3 rounded-xl transition ${
                  n.status === 'UNREAD' ? 'bg-slate-800/50' : 'opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span
                      className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full mb-1 ${
                        n.type === 'BILL_DISPUTED' || n.type === 'NEGATIVE_STOCK'
                          ? 'bg-rose-500/20 text-rose-300'
                          : n.type === 'BILL_SEQUENCE_MISMATCH' || n.type === 'MISSING_BILL_NUMBER'
                          ? 'bg-amber-500/20 text-amber-300'
                          : n.type === 'MODIFICATION_REQUESTED'
                          ? 'bg-purple-500/20 text-purple-300'
                          : 'bg-indigo-500/20 text-indigo-300'
                      }`}
                    >
                      {n.type.replace(/_/g, ' ')}
                    </span>
                    <h4 className="text-sm font-medium text-slate-200">{n.title}</h4>
                    <p className="mt-0.5 text-xs text-slate-400">{n.message}</p>
                    <p className="mt-1 text-[10px] text-slate-500">
                      {new Date(n.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  {n.status === 'UNREAD' && (
                    <button
                      id={`read-notif-btn-${n.id}`}
                      onClick={() => markAsRead(n.id)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 whitespace-nowrap pt-1"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
