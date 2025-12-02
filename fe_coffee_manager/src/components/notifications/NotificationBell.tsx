import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Inbox } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../hooks';

function formatTimeAgo(iso?: string) {
  if (!iso) return '';
  const date = new Date(iso);
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return `${days} days ago`;
}

export function NotificationBell() {
  const { user, managerBranch } = useAuth();
  const navigate = useNavigate();
  const branchId = useMemo(() => {
    if (user?.branch?.branchId) return user.branch.branchId;
    if (user?.branchId) return Number(user.branchId);
    if (managerBranch?.branchId) return managerBranch.branchId;
    return undefined;
  }, [user, managerBranch]);

  const userId = useMemo(() => {
    if (user?.user_id) return user.user_id;
    const numericId = Number(user?.id);
    return Number.isFinite(numericId) ? numericId : undefined;
  }, [user]);

  const [open, setOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleNotificationClick = (notification: any) => {
    // Determine navigation based on title or metadata
    const title = notification.title || '';
    const metadata = notification.metadata || {};
    
    // Check if it's an order notification
    if (title.includes('Đơn hàng') || title.includes('đơn hàng') || metadata.orderId) {
      markAsRead(notification.id);
      navigate('/staff/orders');
      setOpen(false);
      return;
    }
    
    // Check if it's a reservation notification
    if (title.includes('Đặt bàn') || title.includes('đặt bàn') || metadata.reservationId) {
      markAsRead(notification.id);
      navigate('/staff/reservations');
      setOpen(false);
      return;
    }
    
    // For other notification types, just mark as read
    markAsRead(notification.id);
  };

  const userRole = useMemo(() => {
    return user?.role || undefined; // 'staff', 'manager', etc.
  }, [user]);

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    isConnected,
  } = useNotifications({
    branchId,
    userId,
    enabled: !!branchId || !!userId,
    role: userRole,
  });

  // Badge count on the bell icon (capped at 9+ for compact display)
  const displayCount = useMemo(() => {
    if (unreadCount > 9) return '9+';
    return unreadCount.toString();
  }, [unreadCount]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!branchId && !userId) {
    return null;
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() =>
          setOpen((prev) => {
            const next = !prev;
            if (!next) {
              // Reset visible list when closing dropdown
              setVisibleCount(10);
            }
            return next;
          })
        }
        className="relative rounded-full border border-slate-200 bg-white p-2 shadow-sm transition hover:border-sky-300 hover:bg-sky-50"
        title="Notifications"
      >
        <Bell className={`h-5 w-5 ${isConnected ? 'text-sky-500' : 'text-slate-400'}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 rounded-full bg-red-500 px-1.5 text-xs font-semibold text-white">
            {displayCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-3 w-80 rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden ring-1 ring-black/5"
          style={{ zIndex: 10000 }}
        >
          {/* Header */}
          <div className="bg-sky-500 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Notifications</p>
              <p className="text-xs text-sky-100">
                {unreadCount} unread
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllAsRead()}
                className="inline-flex items-center rounded-full bg-sky-100/90 px-3 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-50 hover:text-sky-800 transition"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Content */}
          <div className="max-h-96 overflow-y-auto bg-white">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-10 text-slate-400">
                <Inbox className="h-10 w-10 mb-2" />
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              notifications.slice(0, visibleCount).map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition ${
                    notification.isRead ? 'bg-white hover:bg-slate-50' : 'bg-sky-50 hover:bg-sky-100'
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="mt-1 flex items-center justify-center w-9 h-9 rounded-full bg-sky-100 text-sky-600">
                    <Bell className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {notification.title ?? 'New notification'}
                      </p>
                      {!notification.isRead && (
                        <span className="mt-1 h-2 w-2 rounded-full bg-sky-500 flex-shrink-0" />
                      )}
                    </div>
                    {notification.content && (
                      <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                        {notification.content}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-slate-400">
                      {formatTimeAgo(notification.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer: load more older notifications */}
          {notifications.length > visibleCount && (
            <button
              type="button"
              onClick={() =>
                setVisibleCount((prev) => Math.min(prev + 10, notifications.length))
              }
              className="w-full text-center text-sm font-medium text-sky-600 py-3 border-t border-slate-100 hover:bg-sky-50"
            >
              View more notifications
            </button>
          )}
        </div>
      )}
    </div>
  );
}

