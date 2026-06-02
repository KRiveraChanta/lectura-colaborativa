import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDialog } from './ui/DialogProvider';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Avatar } from 'primereact/avatar';
import { Badge } from 'primereact/badge';
import { Paginator } from 'primereact/paginator';

export function UserProfile() {
  const { id } = useParams<{ id: string }>();
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { token, user: currentUser } = useAuth();
  const { confirm } = useDialog();
  const navigate = useNavigate();

  const [publicLists, setPublicLists] = useState<any[]>([]);

  const [firstPublicBooks, setFirstPublicBooks] = useState(0);
  const publicBooksRows = 3;

  const fetchProfile = async () => {
    try {
      const res = await fetch(`/api/auth/profile/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setProfileData(data);
      }

      const listsRes = await fetch(`/api/lists/user/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (listsRes.ok) {
        const listsData = await listsRes.json();
        setPublicLists(listsData);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [id]);

  const sendFriendRequest = async () => {
    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ recipientId: id })
      });
      if (res.ok) {
        fetchProfile(); // Refresh status
      }
    } catch (error) {
      console.error('Error sending request:', error);
    }
  };

  const removeFriend = async () => {
    const isConfirmed = await confirm({ title: 'Eliminar amigo', message: '¿Seguro que quieres eliminar a este amigo?', type: 'warning' });
    if (!isConfirmed) return;
    try {
      const res = await fetch(`/api/friends/remove/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        fetchProfile(); // Refresh status
      }
    } catch (error) {
      console.error('Error removing friend:', error);
    }
  };

  const acceptFriendRequest = async () => {
    if (!profileData?.friendshipId) return;
    try {
      const res = await fetch(`/api/friends/accept/${profileData.friendshipId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchProfile();
    } catch (e) {
      console.error(e);
    }
  };

  const rejectFriendRequest = async () => {
    if (!profileData?.friendshipId) return;
    try {
      const res = await fetch(`/api/friends/reject/${profileData.friendshipId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchProfile();
    } catch (e) {
      console.error(e);
    }
  };

  const handleVisibilityChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newVisibility = e.target.value;
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ completedBooksVisibility: newVisibility })
      });
      if (res.ok) {
        fetchProfile();
      }
    } catch (error) {
      console.error('Error updating visibility:', error);
    }
  };

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center min-vh-100">
        <i className="pi pi-spin pi-spinner text-primary" style={{ fontSize: '3rem' }}></i>
    </div>
  );
  if (!profileData || !profileData.user) return (
    <div className="d-flex justify-content-center align-items-center min-vh-100">
        <h3 className="text-secondary fw-bold">Usuario no encontrado</h3>
    </div>
  );

  const { user, publicBooks, friendshipStatus, completedBooks, canSeeLogros, friends } = profileData;
  const isSelf = currentUser?.id === id;
  const hasLogros = canSeeLogros; // Only depends on visibility permissions now

  return (
    <div className="container-fluid py-5 min-vh-100 px-md-4 px-lg-5" style={{ backgroundColor: 'var(--surface-ground)' }}>
      <div className="mx-auto" style={{ maxWidth: '1450px' }}>
        
        <div className="row mb-5">
          <div className={`col-12 ${hasLogros ? 'col-lg-8' : ''}`}>
            <div className="bg-white shadow-sm rounded border-0 h-100 overflow-hidden text-center text-md-start mb-0 d-flex flex-column">
              {user.coverUrl ? (
                <div style={{ width: '100%', height: '200px', backgroundImage: `url(${user.coverUrl.startsWith('http') ? user.coverUrl : user.coverUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
              ) : (
                <div style={{ width: '100%', height: '120px', backgroundColor: '#e9ecef' }}></div>
              )}
              <div className="p-4 px-md-5 flex-grow-1">
                <div className="d-flex flex-column flex-md-row align-items-center align-items-md-start gap-4">
                  <div style={{ marginTop: user.coverUrl ? '-80px' : '-60px' }}>
                    {user.avatarUrl ? (
                      <Avatar image={`${user.avatarUrl}`} shape="circle" size="xlarge" className="shadow bg-white flex-shrink-0" style={{ width: '120px', height: '120px', minWidth: '120px', minHeight: '120px', border: '4px solid white' }} />
                    ) : (
                      <Avatar label={user.username.charAt(0).toUpperCase()} shape="circle" size="xlarge" className="bg-primary text-white shadow bg-white flex-shrink-0" style={{ width: '120px', height: '120px', minWidth: '120px', minHeight: '120px', fontSize: '3rem', border: '4px solid white' }} />
                    )}
                  </div>
                
                <div className="flex-grow-1 pt-2">
                  <h1 className="display-5 fw-bolder text-dark mb-1">{user.username}</h1>
                  <div className="d-flex flex-column flex-md-row align-items-center align-items-md-start justify-content-between mb-0 gap-2">
                    <p className="text-secondary fw-bold m-0">Miembro desde {new Date(user.createdAt).toLocaleDateString()}</p>
                  </div>

                  {user.bio && (
                    <div className="mb-4 text-center text-md-start position-relative px-0 pt-1 pb-3 bg-transparent rounded">
                      <i className="pi pi-quote-left text-primary mb-1 d-block" style={{ fontSize: '1.5rem', opacity: 0.5 }}></i>
                      <p className="fst-italic text-dark lh-base mb-0" style={{ whiteSpace: 'pre-wrap', fontSize: '1.05rem' }}>
                        {user.bio}
                      </p>
                    </div>
                  )}

                  {/* Medals */}
                  {(() => {
                    const booksCount = completedBooks ? completedBooks.length : 0;
                    return booksCount >= 1 ? (
                      <div className="mb-4 text-center text-md-start">
                        <div className="d-flex flex-wrap gap-3 justify-content-center justify-content-md-start">
                          {booksCount >= 1 && (
                            <div className="d-flex align-items-center gap-2 px-3 py-2 rounded shadow-sm" style={{ backgroundColor: '#fff', border: '2px solid #cd7f32' }}>
                              <div className="rounded-circle d-flex align-items-center justify-content-center shadow-sm" style={{ width: '35px', height: '35px', backgroundColor: '#cd7f32', color: '#fff' }}>
                                <i className="pi pi-trophy" style={{ fontSize: '1.2rem' }}></i>
                              </div>
                              <span className="fw-bold text-dark">1 Libro</span>
                            </div>
                          )}
                          {booksCount >= 5 && (
                            <div className="d-flex align-items-center gap-2 px-3 py-2 rounded shadow-sm" style={{ backgroundColor: '#fff', border: '2px solid #c0c0c0' }}>
                              <div className="rounded-circle d-flex align-items-center justify-content-center shadow-sm" style={{ width: '35px', height: '35px', backgroundColor: '#c0c0c0', color: '#000' }}>
                                <i className="pi pi-star-fill" style={{ fontSize: '1.2rem' }}></i>
                              </div>
                              <span className="fw-bold text-dark">5 Libros</span>
                            </div>
                          )}
                          {booksCount >= 10 && (
                            <div className="d-flex align-items-center gap-2 px-3 py-2 rounded shadow-sm" style={{ backgroundColor: '#fff', border: '2px solid #ffd700' }}>
                              <div className="rounded-circle d-flex align-items-center justify-content-center shadow-sm" style={{ width: '35px', height: '35px', backgroundColor: '#ffd700', color: '#000' }}>
                                <i className="pi pi-star-fill" style={{ fontSize: '1.2rem' }}></i>
                              </div>
                              <span className="fw-bold text-dark">10 Libros</span>
                            </div>
                          )}
                          {booksCount >= 20 && (
                            <div className="d-flex align-items-center gap-2 px-3 py-2 rounded shadow-sm" style={{ backgroundColor: '#fff', border: '2px solid #e5e4e2' }}>
                              <div className="rounded-circle d-flex align-items-center justify-content-center shadow-sm" style={{ width: '35px', height: '35px', backgroundColor: '#e5e4e2', color: '#000' }}>
                                <i className="pi pi-sparkles" style={{ fontSize: '1.2rem' }}></i>
                              </div>
                              <span className="fw-bold text-dark">20 Libros</span>
                            </div>
                          )}
                          {booksCount >= 30 && (
                            <div className="d-flex align-items-center gap-2 px-3 py-2 rounded shadow-sm" style={{ backgroundColor: '#fff', border: '2px solid #b9f2ff' }}>
                              <div className="rounded-circle d-flex align-items-center justify-content-center shadow-sm" style={{ width: '35px', height: '35px', backgroundColor: '#b9f2ff', color: '#000' }}>
                                <i className="pi pi-crown" style={{ fontSize: '1.2rem' }}></i>
                              </div>
                              <span className="fw-bold text-dark">30 Libros</span>
                            </div>
                          )}
                          {booksCount >= 40 && (
                            <div className="d-flex align-items-center gap-2 px-3 py-2 rounded shadow-sm" style={{ backgroundColor: '#fff', border: '2px solid #e0115f' }}>
                              <div className="rounded-circle d-flex align-items-center justify-content-center shadow-sm" style={{ width: '35px', height: '35px', backgroundColor: '#e0115f', color: '#fff' }}>
                                <i className="pi pi-heart-fill" style={{ fontSize: '1.2rem' }}></i>
                              </div>
                              <span className="fw-bold text-dark">40 Libros</span>
                            </div>
                          )}
                          {booksCount >= 50 && (
                            <div className="d-flex align-items-center gap-2 px-3 py-2 rounded shadow-sm" style={{ backgroundColor: '#fff', border: '2px solid #50c878' }}>
                              <div className="rounded-circle d-flex align-items-center justify-content-center shadow-sm" style={{ width: '35px', height: '35px', backgroundColor: '#50c878', color: '#000' }}>
                                <i className="pi pi-bolt" style={{ fontSize: '1.2rem' }}></i>
                              </div>
                              <span className="fw-bold text-dark">50 Libros</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null;
                  })()}

                  {isSelf && (
                    <div className="text-center text-md-start mb-4">
                      <Button 
                        label="Editar Perfil" 
                        icon="pi pi-user-edit" 
                        onClick={() => navigate('/profile/edit')} 
                        className="p-button-outlined p-button-secondary p-button-sm shadow-sm" 
                      />
                    </div>
                  )}
                  
                  {!isSelf && (
                    <div>
                      {friendshipStatus === 'none' && (
                        <Button label="Añadir como amigo" icon="pi pi-user-plus" onClick={sendFriendRequest} className="p-button-primary shadow-sm" />
                      )}
                      {friendshipStatus === 'request_sent' && (
                        <Button label="Solicitud enviada" icon="pi pi-clock" disabled className="p-button-secondary" />
                      )}
                      {friendshipStatus === 'request_received' && (
                        <div className="d-flex flex-column align-items-center align-items-md-start gap-2">
                          <span className="small text-secondary fw-bold">Te envió una solicitud de amistad</span>
                          <div className="d-flex gap-2">
                            <Button label="Aceptar" icon="pi pi-check" onClick={acceptFriendRequest} className="p-button-success shadow-sm" />
                            <Button label="Rechazar" icon="pi pi-times" onClick={rejectFriendRequest} className="p-button-secondary p-button-outlined shadow-sm" />
                          </div>
                        </div>
                      )}
                      {friendshipStatus === 'friends' && (
                        <div className="d-flex justify-content-center justify-content-md-start gap-2 align-items-center">
                          <Badge value="Amigos" severity="success" className="p-3 fs-6 d-inline-flex align-items-center justify-content-center" style={{ borderRadius: '20px' }}>
                              <i className="pi pi-check me-2"></i>
                          </Badge>
                          <Button label="Eliminar amigo" icon="pi pi-user-minus" onClick={removeFriend} className="p-button-danger p-button-outlined shadow-sm" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              </div>
            </div>
          </div>

          {hasLogros && (
            <div className="col-12 col-lg-4 mt-5 mt-lg-0">
              <div className="logros-container h-100 bg-white px-4 rounded shadow-sm d-flex flex-column" style={{ maxHeight: '600px', overflowY: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none', paddingTop: '12px', paddingBottom: '12px' }}>
                <style>{`
                  .logros-container::-webkit-scrollbar {
                    display: none;
                  }
                `}</style>
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h2 className="fw-bold text-dark m-0 border-start border-warning border-4 ps-3" style={{ fontSize: '25px' }}>
                    <i className="pi pi-star-fill text-warning me-2"></i>Logros
                  </h2>
                  {isSelf && (
                    <div className="d-flex align-items-center gap-2">
                      <span className="small text-secondary fw-bold d-none d-md-inline">Visibilidad:</span>
                      <select 
                        className="form-select form-select-sm" 
                        value={user.completedBooksVisibility || 'public'}
                        onChange={handleVisibilityChange}
                        style={{ width: 'auto' }}
                      >
                        <option value="public">Público</option>
                        <option value="friends">Solo Amigos</option>
                        <option value="private">Privado</option>
                      </select>
                    </div>
                  )}
                </div>
                
                {completedBooks && completedBooks.length > 0 ? (
                  <div className="d-flex flex-column gap-3">
                    {completedBooks.map((book: any) => (
                      <div key={book.id}>
                        <Link to={`/read/${book.id}`} className="text-decoration-none">
                          <div className="bg-white shadow-sm border rounded card-hover-effect overflow-hidden p-0">
                            <div className="d-flex flex-row align-items-center" style={{ padding: '12px 0' }}>
                              {book.coverUrl ? (
                                <img src={book.coverUrl.startsWith('http') ? book.coverUrl : `${book.coverUrl}`} alt={book.title} className="ms-2 rounded shadow-sm" style={{ width: '50px', height: '75px', objectFit: 'cover' }} />
                              ) : (
                                <div className="bg-light d-flex align-items-center justify-content-center ms-2 rounded shadow-sm" style={{ width: '50px', height: '75px' }}>
                                  <i className="pi pi-book text-secondary" style={{ fontSize: '1rem' }}></i>
                                </div>
                              )}
                              <div className="px-3 flex-grow-1 min-w-0" style={{ overflow: 'hidden' }}>
                                <h6 className="fw-bold text-dark text-truncate mb-1 m-0">{book.title}</h6>
                                <p className="text-secondary fw-bold m-0 text-truncate" style={{ fontSize: '0.8rem' }}>{book.author}</p>
                              </div>
                              <div className="pe-3">
                                <Badge value="100%" severity="success" className="shadow-sm border border-white px-2 py-1 text-xs" />
                              </div>
                            </div>
                          </div>
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="d-flex flex-column align-items-center justify-content-center text-center h-100 py-5 opacity-75">
                    <i className="pi pi-compass text-secondary mb-3" style={{ fontSize: '3rem' }}></i>
                    <h5 className="fw-bold text-secondary m-0">En proceso de lograrlo.</h5>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {publicBooks && publicBooks.length > 0 && (
          <div className="mb-5">
            <h2 className="fw-bold text-dark mb-4 border-start border-primary border-4 ps-3">Libros Públicos</h2>
            <div className="row g-4">
              {publicBooks.slice(firstPublicBooks, firstPublicBooks + publicBooksRows).map((book: any) => (
                <div className="col-12 col-sm-6 col-lg-4" key={book.id}>
                  <Link to={`/read/${book.id}`} className="text-decoration-none">
                    <Card className="h-100 shadow-sm border-0 card-hover-effect overflow-hidden p-0">
                      {book.coverUrl ? (
                        <img src={book.coverUrl.startsWith('http') ? book.coverUrl : `${book.coverUrl}`} alt={book.title} className="w-100" style={{ height: '200px', objectFit: 'cover' }} />
                      ) : (
                        <div className="w-100 bg-light d-flex align-items-center justify-content-center" style={{ height: '200px' }}>
                          <span className="text-secondary fw-bold">Sin Portada</span>
                        </div>
                      )}
                      <div className="p-3">
                        <h5 className="fw-bold text-dark text-truncate">{book.title}</h5>
                        <p className="small text-secondary fw-bold m-0">{book.author}</p>
                      </div>
                    </Card>
                  </Link>
                </div>
              ))}
            </div>
            {publicBooks.length > publicBooksRows && (
                <Paginator first={firstPublicBooks} rows={publicBooksRows} totalRecords={publicBooks.length} onPageChange={(e) => setFirstPublicBooks(e.first)} className="mt-4 bg-transparent border-0" />
            )}
          </div>
        )}

        {publicLists && publicLists.length > 0 && (
          <div className="mb-5">
            <h2 className="fw-bold text-dark mb-4 border-start border-info border-4 ps-3">Listas Públicas</h2>
            <div className="row g-4">
              {publicLists.map((list: any) => (
                <div className="col-12 col-sm-6 col-lg-4" key={list.id}>
                  <Card className="shadow-sm border-0 card-hover-effect">
                     <h5 className="fw-bold text-dark mb-2">{list.name}</h5>
                     <p className="small text-secondary fw-bold m-0">{list.books ? list.books.length : 0} libros</p>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        )}

        {friends && friends.length > 0 && (
          <div className="mb-5">
            <h2 className="fw-bold text-dark mb-4 border-start border-success border-4 ps-3">Amigos ({friends.length})</h2>
            <div className="bg-white p-4 rounded-4 border border-secondary border-opacity-25 shadow-sm">
              <div className="row g-4">
                {friends.map((friend: any) => (
                  <div className="col-12 col-sm-6 col-md-4 col-lg-3" key={friend.id}>
                    <Link to={`/profile/${friend.id}`} className="text-decoration-none">
                      <div className="p-3 rounded-4 bg-light border border-secondary border-opacity-10 card-hover-effect d-flex flex-row align-items-center gap-3">
                        {friend.avatarUrl ? (
                          <Avatar image={`${friend.avatarUrl}`} shape="circle" size="large" className="shadow-sm flex-shrink-0" style={{ width: '50px', height: '50px', minWidth: '50px', minHeight: '50px' }} />
                        ) : (
                          <Avatar label={friend.username.charAt(0).toUpperCase()} shape="circle" size="large" className="bg-primary text-white shadow-sm flex-shrink-0" style={{ width: '50px', height: '50px', minWidth: '50px', minHeight: '50px', fontSize: '1.2rem' }} />
                        )}
                        <div className="text-truncate">
                          <h6 className="fw-bold text-dark m-0 text-truncate">{friend.username}</h6>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
