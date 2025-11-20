import { useEffect, useMemo, useRef, useState } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    notifications,
    unreadCount,
    markAsRead,
    clearAll,
    isConnected,
  } = useNotifications({
    branchId,
    userId,
    enabled: !!branchId || !!userId,
  });

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
        onClick={() => setOpen((prev) => !prev)}
        className="relative rounded-full border border-amber-200 bg-white/80 p-2 shadow-sm transition hover:border-amber-300 hover:bg-white"
        title="Notifications"
      >
        <Bell className={`h-5 w-5 ${isConnected ? 'text-amber-600' : 'text-slate-400'}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 rounded-full bg-red-500 px-1.5 text-xs font-semibold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-80 rounded-xl border border-amber-100 bg-white shadow-2xl ring-1 ring-black/5">
          <div className="flex items-center justify-between border-b border-amber-50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Notifications</p>
              <p className="text-xs text-slate-500">{unreadCount} unread</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => clearAll()}
                className="rounded-full border border-amber-200 px-2.5 py-1 text-xs text-slate-500 transition hover:border-amber-300 hover:text-amber-600"
              >
                Clear all
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-4 py-10 text-slate-400">
                <Inbox className="h-10 w-10 mb-2" />
                  <p className="text-sm">No notifications</p>
              </div>
            ) : (
              notifications.slice(0, 10).map((notification) => (
                <div
                  key={notification.id}
                  className={`cursor-pointer px-4 py-3 transition hover:bg-amber-50 ${
                    notification.isRead ? 'bg-white' : 'bg-amber-50/70'
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex justify-between">
                    <p className="text-sm font-medium text-slate-900">
                      {notification.title ?? 'New notification'}
                    </p>
                    {!notification.isRead && (
                      <Check className="h-4 w-4 text-amber-500 opacity-70" />
                    )}
                  </div>
                  {notification.content && (
                    <p className="mt-1 text-xs text-slate-500">{notification.content}</p>
                  )}
                  <p className="mt-1 text-xs text-slate-400">
                    {formatTimeAgo(notification.createdAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

