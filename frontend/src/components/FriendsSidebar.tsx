import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import { useAuth } from '../context/AuthContext';
import { Sidebar } from 'primereact/sidebar';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Avatar } from 'primereact/avatar';
import { Badge } from 'primereact/badge';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';

export function FriendsSidebar() {
  const [friends, setFriends] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [visible, setVisible] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(() => {
    const saved = localStorage.getItem('friendsSidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [pendingCount, setPendingCount] = useState(0);
  const navigate = useNavigate();
  const { token, isAuthenticated } = useAuth();

  useEffect(() => {
    localStorage.setItem('friendsSidebarCollapsed', JSON.stringify(isDesktopCollapsed));
  }, [isDesktopCollapsed]);

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const fetchFriends = async () => {
      try {
        const res = await fetch('/api/friends/list', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setFriends(data);
        }
      } catch (err) {
        console.error('Error fetching friends:', err);
      }
    };

    const fetchPendingRequests = async () => {
      try {
        const res = await fetch('/api/friends/pending', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setPendingCount(data.length);
        }
      } catch (err) {
        console.error('Error fetching pending requests:', err);
      }
    };

    fetchFriends();
    fetchPendingRequests();

    const handleOnlineUsersList = (usersList: string[]) => {
      setOnlineUsers(new Set(usersList));
    };

    const handleUserOnline = (userId: string) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.add(userId);
        return newSet;
      });
    };

    const handleUserOffline = (userId: string) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    };

    socket.on('online_users_list', handleOnlineUsersList);
    socket.on('user_online', handleUserOnline);
    socket.on('user_offline', handleUserOffline);

    return () => {
      socket.off('online_users_list', handleOnlineUsersList);
      socket.off('user_online', handleUserOnline);
      socket.off('user_offline', handleUserOffline);
    };
  }, [isAuthenticated, token]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}&tab=users`);
      setVisible(false);
    }
  };

  if (!isAuthenticated) return null;

  const content = (
    <div className="d-flex flex-column h-100">
      <div className="mb-3">
        <form onSubmit={handleSearchSubmit}>
          <IconField iconPosition="left">
            <InputIcon className="pi pi-search"> </InputIcon>
            <InputText 
              placeholder="Buscar amigos..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-100 p-inputtext-sm"
            />
          </IconField>
        </form>
        <div className="mt-2 text-center">
          <Link to="/requests" onClick={() => setVisible(false)} className="text-decoration-none small text-primary fw-bold">
            Ver Solicitudes Pendientes ({pendingCount})
          </Link>
        </div>
      </div>
      
      <div className="flex-grow-1 overflow-auto">
        {friends.length === 0 ? (
          <div className="text-center text-secondary small mt-4">
            Aún no tienes amigos.
            <br/>
            <Link to="/search" onClick={() => setVisible(false)} className="text-primary text-decoration-none fw-bold mt-2 d-block">
              Buscar amigos
            </Link>
          </div>
        ) : (
          <ul className="list-unstyled m-0">
            {friends.map(friend => {
              const isOnline = onlineUsers.has(friend.id);
              return (
                <li key={friend.id} className="mb-2">
                  <Link 
                    to={`/profile/${friend.id}`}
                    className="d-flex align-items-center text-decoration-none p-2 rounded hover-bg-light transition-all"
                    style={{ color: 'var(--text-color)' }}
                    onClick={() => setVisible(false)}
                  >
                    <div className="position-relative me-3">
                      {friend.avatarUrl ? (
                        <Avatar image={friend.avatarUrl} shape="circle" />
                      ) : (
                        <Avatar label={friend.username.charAt(0).toUpperCase()} shape="circle" className="bg-secondary text-white" />
                      )}
                      <Badge severity={isOnline ? 'success' : 'secondary'} className="position-absolute bottom-0 end-0 border border-white" style={{ minWidth: '12px', height: '12px', padding: 0 }}></Badge>
                    </div>
                    <span className="fw-medium text-truncate" style={{ maxWidth: '150px' }}>
                      {friend.username}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar Panel */}
      {!isDesktopCollapsed && (
        <div className="d-none d-md-flex flex-column border-start p-3 shadow-sm h-100 transition-all" style={{ width: '250px', backgroundColor: 'var(--surface-card)', color: 'var(--text-color)', borderColor: 'var(--surface-border)' }}>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="m-0 fw-bold">AMIGOS <Badge value={friends.length} severity="info"></Badge></h6>
            <Button icon="pi pi-angle-right" rounded text severity="secondary" size="small" onClick={() => setIsDesktopCollapsed(true)} tooltip="Ocultar" tooltipOptions={{ position: 'left' }} />
          </div>
          {content}
        </div>
      )}

      {/* Floating Button */}
      <style>
        {`
            .mobile-friends-btn {
                width: 3.85rem !important; 
                height: 3.85rem !important; 
                padding: 0.6rem !important;
            }
            .mobile-friends-btn .pi {
                font-size: 1.65rem !important;
            }
            @media (min-width: 768px) {
                .mobile-friends-btn {
                    width: 3.5rem !important; 
                    height: 3.5rem !important; 
                    padding: 1rem !important;
                }
                .mobile-friends-btn .pi {
                    font-size: 1.5rem !important;
                }
            }
        `}
      </style>
      <div 
        className={`position-fixed ${!isDesktopCollapsed ? 'd-md-none' : ''}`}
        style={{ bottom: '20px', right: '20px', zIndex: 1000 }}
      >
          <Button 
            icon="pi pi-users" 
            className="shadow-lg p-button-rounded p-button-icon-only mobile-friends-btn w-100 h-100" 
            style={{ borderRadius: '50%' }}
            onClick={() => {
              if (window.innerWidth >= 768) {
                setIsDesktopCollapsed(false);
              } else {
                setVisible(true);
              }
            }}
            tooltip="Mostrar amigos"
            tooltipOptions={{ position: 'left' }}
          />
          {onlineUsers.size > 0 && (
            <Badge 
                severity="success" 
                value="" 
                className="position-absolute border border-white" 
                style={{ top: '0px', right: '0px', minWidth: '14px', height: '14px', padding: 0, zIndex: 1 }}
            />
          )}
      </div>

      {/* Mobile Sidebar */}
      <Sidebar visible={visible} position="right" onHide={() => setVisible(false)} className="w-100" style={{ maxWidth: '300px' }}>
        <h5 className="fw-bold mb-3">AMIGOS <Badge value={friends.length} severity="info"></Badge></h5>
        {content}
      </Sidebar>
    </>
  );
}
