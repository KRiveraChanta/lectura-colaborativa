import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { socket } from '../socket';
import { Button } from 'primereact/button';
import { OverlayPanel } from 'primereact/overlaypanel';
import { Badge } from 'primereact/badge';

export function NotificationsDropdown() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const { token, isAuthenticated } = useAuth();
  const op = useRef<OverlayPanel>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/notifications', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setNotifications(data);
        }
      } catch (err) {
        console.error('Error fetching notifications:', err);
      }
    };

    fetchNotifications();

    const handleNewNotification = (notification: any) => {
      setNotifications(prev => [notification, ...prev]);
    };

    socket.on('new_notification', handleNewNotification);

    return () => {
      socket.off('new_notification', handleNewNotification);
    };
  }, [isAuthenticated, token]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = async (notif: any) => {
    op.current?.hide();
    if (!notif.read) {
      try {
        await fetch(`/api/notifications/${notif.id}/read`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
      } catch (e) {
        console.error(e);
      }
    }

    if (notif.type === 'friend_request') {
      if (notif.senderId || notif.sender?.id) {
        navigate(`/profile/${notif.senderId || notif.sender?.id}`);
      } else {
        navigate('/profile');
      }
    } else if (notif.type === 'book_access' || notif.type === 'comment_reply' || notif.type === 'comment_like') {
      navigate(`/read/${notif.relatedId}`);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <>
      <Button 
        type="button" 
        text 
        rounded 
        onClick={(e) => op.current?.toggle(e)}
        tooltip={window.innerWidth > 768 ? "Notificaciones" : undefined}
        tooltipOptions={{ position: 'bottom' }}
        className="me-2"
        style={{ overflow: 'visible' }}
      >
        <i className="pi pi-bell p-overlay-badge" style={{ fontSize: '1.2rem' }}>
          {unreadCount > 0 && <Badge value={unreadCount > 9 ? '9+' : unreadCount} severity="danger" />}
        </i>
      </Button>

      <OverlayPanel ref={op} showCloseIcon style={{ width: '350px', maxWidth: '90vw' }}>
        <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
          <div className="d-flex align-items-center gap-2">
            <h6 className="m-0 fw-bold">Notificaciones</h6>
            {unreadCount > 0 && <Badge value={`${unreadCount} nuevas`} severity="info" />}
          </div>
          {unreadCount > 0 && (
            <Button 
              icon="pi pi-check-circle" 
              label="Marcar todo como leído" 
              className="p-button-text p-button-sm p-0 text-primary small" 
              style={{ fontSize: '0.8rem' }}
              onClick={handleMarkAllAsRead} 
            />
          )}
        </div>
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {notifications.length === 0 ? (
            <div className="text-center text-secondary p-3">
              No tienes notificaciones
            </div>
          ) : (
            <ul className="list-unstyled m-0">
              {notifications.map(notif => {
                let iconClass = 'pi pi-book';
                let iconColor = 'text-primary';
                if (notif.type === 'friend_request') { iconClass = 'pi pi-users'; }
                else if (notif.type === 'comment_reply') { iconClass = 'pi pi-comment'; }
                else if (notif.type === 'comment_like') { iconClass = 'pi pi-heart-fill'; iconColor = 'text-danger'; }

                return (
                  <li 
                    key={notif.id} 
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-2 mb-2 rounded cursor-pointer d-flex align-items-start ${!notif.read ? 'bg-light' : ''}`}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className={`me-3 mt-1 ${iconColor}`}>
                      <i className={iconClass} style={{ fontSize: '1.2rem' }}></i>
                    </div>
                    <div className="flex-grow-1">
                      <p className={`mb-1 small ${!notif.read ? 'fw-bold' : ''}`}>
                        {notif.message}
                      </p>
                      <small className="text-secondary">
                        {new Date(notif.createdAt).toLocaleDateString()}
                      </small>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </OverlayPanel>
    </>
  );
}
