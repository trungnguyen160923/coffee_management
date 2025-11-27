import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';
import { useAuth } from '../../context/AuthContext';

function formatTimeAgo(iso) {
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const userId = useMemo(() => {
    if (user?.userId) return user.userId;
    if (user?.id) return Number(user.id);
    return undefined;
  }, [user]);

  const userRole = useMemo(() => {
    // Map role to uppercase: 'customer' -> 'CUSTOMER', 'user' -> 'CUSTOMER'
    if (user?.role) {
      const role = user.role.toLowerCase();
      if (role === 'customer' || role === 'user') {
        return 'CUSTOMER';
      }
      return user.role.toUpperCase();
    }
    return 'CUSTOMER'; // Default to CUSTOMER for web-app users
  }, [user]);

  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    isConnected,
  } = useNotifications({
    userId,
    enabled: !!userId,
    role: userRole,
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (notification) => {
    // Always mark as read first
    markAsRead(notification.id);
    setOpen(false); // Close dropdown after clicking

    // Parse metadata if it's a string
    let metadata = notification.metadata;
    if (typeof metadata === 'string') {
      try {
        metadata = JSON.parse(metadata);
      } catch (e) {
        metadata = null;
      }
    }

    // Check if it's an order notification
    // Check metadata first, then type, then title
    const hasOrderId = metadata?.orderId !== undefined;
    const isOrderType = notification.type?.includes('ORDER') || notification.type === 'ORDER_CREATED' || notification.type === 'ORDER_STATUS_UPDATED' || notification.type === 'ORDER_CANCELLED';
    const isOrderTitle = notification.title?.includes('Đơn hàng') || notification.title?.includes('đơn hàng');
    const isOrderNotification = hasOrderId || isOrderType || isOrderTitle;

    // Check if it's a reservation notification
    // Check metadata first, then type, then title
    const hasReservationId = metadata?.reservationId !== undefined;
    const isReservationType = notification.type?.includes('RESERVATION') || notification.type === 'RESERVATION_CREATED';
    const isReservationTitle = notification.title?.includes('Đặt bàn') || notification.title?.includes('đặt bàn');
    const isReservationNotification = hasReservationId || isReservationType || isReservationTitle;

    // Navigate based on notification type
    if (isOrderNotification) {
      // Order notification: navigate to orders page
      navigate('/users/orders');
    } else if (isReservationNotification) {
      // Reservation notification: navigate to bookings page
      navigate('/users/bookings');
    } else {
      // Other notification types: only mark as read, no navigation
      // (Already marked as read above, so nothing else to do)
    }
  };

  if (!userId) {
    return null;
  }

  return (
    <div className="position-relative" ref={containerRef} style={{ marginLeft: '10px' }}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="btn btn-link nav-link position-relative p-2"
        style={{ 
          border: 'none', 
          background: 'transparent',
          color: 'inherit',
          textDecoration: 'none'
        }}
        title="Notifications"
      >
        <span className="icon icon-bell" style={{ fontSize: '20px' }}></span>
        {unreadCount > 0 && (
          <span
            className="badge badge-pill"
            style={{
              position: 'absolute',
              top: '0',
              right: '0',
              transform: 'translate(50%, -30%)',
              backgroundColor: '#dc3545',
              color: '#fff',
              fontSize: '10px',
              padding: '2px 6px',
              borderRadius: '999px',
              lineHeight: 1,
              minWidth: '18px',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="dropdown-menu show"
          style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            marginTop: '8px',
            minWidth: '320px',
            maxHeight: '480px',
            overflowY: 'auto',
            backgroundColor: '#1a1a1a',
            border: '1px solid #c49b63',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
            zIndex: 10000,
          }}
        >
          <div 
            className="px-3 py-2 d-flex justify-content-between align-items-center"
            style={{
              borderBottom: '1px solid #c49b63',
              backgroundColor: '#2a2a2a',
            }}
          >
            <div>
              <h6 className="mb-0" style={{ fontSize: '14px', fontWeight: '600', color: '#c49b63' }}>
                Notifications
              </h6>
              <small style={{ fontSize: '12px', color: '#999' }}>
                {unreadCount} unread
              </small>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="btn btn-sm btn-link p-0"
                style={{ 
                  fontSize: '12px', 
                  textDecoration: 'none',
                  color: '#c49b63',
                }}
                onMouseEnter={(e) => e.target.style.color = '#d4b573'}
                onMouseLeave={(e) => e.target.style.color = '#c49b63'}
              >
                Mark all as read
              </button>
            )}
          </div>

          <div style={{ maxHeight: '400px', overflowY: 'auto', backgroundColor: '#1a1a1a' }}>
            {notifications.length === 0 ? (
              <div className="text-center py-4" style={{ color: '#999' }}>
                <span className="icon icon-inbox" style={{ fontSize: '32px', display: 'block', marginBottom: '8px', color: '#666' }}></span>
                <p className="mb-0" style={{ fontSize: '14px' }}>No notifications</p>
              </div>
            ) : (
              notifications.slice(0, 10).map((notification) => (
                <div
                  key={notification.id}
                  className="px-3 py-2"
                  style={{
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    borderBottom: '1px solid #333',
                    backgroundColor: notification.isRead ? '#1a1a1a' : '#2a2a2a',
                  }}
                  onClick={() => handleNotificationClick(notification)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#333';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = notification.isRead ? '#1a1a1a' : '#2a2a2a';
                  }}
                >
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="flex-grow-1">
                      <p 
                        className="mb-1" 
                        style={{ 
                          fontSize: '14px', 
                          fontWeight: notification.isRead ? '400' : '600',
                          color: notification.isRead ? '#ccc' : '#fff',
                        }}
                      >
                        {notification.title || 'New notification'}
                      </p>
                      {notification.content && (
                        <p className="mb-1" style={{ fontSize: '12px', color: '#999' }}>
                          {notification.content}
                        </p>
                      )}
                      <small style={{ fontSize: '11px', color: '#666' }}>
                        {formatTimeAgo(notification.createdAt)}
                      </small>
                    </div>
                    {!notification.isRead && (
                      <span
                        className="badge badge-pill"
                        style={{
                          backgroundColor: '#c49b63',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          marginLeft: '8px',
                          marginTop: '4px',
                        }}
                      ></span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

