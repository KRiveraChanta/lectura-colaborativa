import { useState, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home } from './components/Home';
import { Catalog } from './components/Catalog';
import { UploadBookForm } from './components/UploadBookForm';
import { ReaderInterface } from './components/ReaderInterface';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { Profile } from './components/Profile';
import { UserProfile } from './components/UserProfile';
import { SearchPage } from './components/SearchPage';
import { FriendsSidebar } from './components/FriendsSidebar';
import { FriendRequestsPage } from './components/FriendRequestsPage';
import { ForgotPassword } from './components/ForgotPassword';
import { NotificationsDropdown } from './components/NotificationsDropdown';
import { AdminDashboard } from './components/AdminDashboard';
import { BookPresentation } from './components/BookPresentation';
import { MyAnnotations } from './components/MyAnnotations';
import { ErrorBoundary } from './ErrorBoundary';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import { DialogProvider } from './components/ui/DialogProvider';

// PrimeReact Components
import { Menubar } from 'primereact/menubar';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Avatar } from 'primereact/avatar';
import { Menu } from 'primereact/menu';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';

function Navigation() {
  const { user, logout, isAuthenticated } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const userMenuRef = useRef<Menu>(null);
  
  const [logoClicks, setLogoClicks] = useState(0);
  const [showParrot, setShowParrot] = useState(false);

  const handleLogoClick = () => {
    setLogoClicks(prev => {
      const newCount = prev + 1;
      if (newCount === 5) {
        setShowParrot(true);
        setTimeout(() => setShowParrot(false), 3000);
        return 0;
      }
      return newCount;
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}&tab=books`);
    }
  };

  const start = (
    <div className="d-flex align-items-center me-4 cursor-pointer user-select-none" onClick={handleLogoClick}>
      <Link to="/" className="d-flex align-items-center text-decoration-none">
        <Avatar label="L" shape="circle" className="bg-primary text-white fw-bold me-2" />
        <h4 className="m-0 text-primary fw-bold d-none d-md-block">Lectura Colaborativa</h4>
      </Link>
    </div>
  );

  const items: any[] = [
    {
      template: () => (
        <div className="px-3 py-2 d-md-none w-100" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          <form onSubmit={(e) => {
              handleSearchSubmit(e);
              // Programmatically click the hamburger menu to close it
              const menubarBtn = document.querySelector('.p-menubar-button') as HTMLElement;
              if (menubarBtn) menubarBtn.click();
          }}>
            <div className="d-flex gap-2">
              <IconField iconPosition="left" className="w-100">
                <InputIcon className="pi pi-search"> </InputIcon>
                <InputText placeholder="Buscar libros..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="p-inputtext-sm rounded-pill w-100" />
              </IconField>
              {searchQuery.length > 0 && (
                <Button type="submit" icon="pi pi-search" rounded className="p-button-primary flex-shrink-0" aria-label="Buscar" style={{ width: '2.5rem', height: '2.5rem', padding: 0 }} />
              )}
            </div>
          </form>
        </div>
      ),
      className: 'd-md-none'
    },
    { separator: true, className: 'd-md-none' },
    { label: 'Inicio', icon: 'pi pi-home', command: () => navigate('/'), className: location.pathname === '/' ? 'active-menuitem' : '' },
    { label: 'Catálogo', icon: 'pi pi-book', command: () => navigate('/search'), className: location.pathname === '/search' ? 'active-menuitem' : '' },
  ];
  if (user?.role === 'admin') {
    items.push({ label: 'Admin', icon: 'pi pi-cog', command: () => navigate('/admin'), className: location.pathname === '/admin' ? 'active-menuitem' : '' });
  }

  const userMenuItems = [
    { label: 'Mi Perfil', icon: 'pi pi-user', command: () => navigate(`/profile/${user?.id}`) },
    { label: 'Mi Catálogo', icon: 'pi pi-folder', command: () => navigate('/catalog') },
    { label: 'Mis Anotaciones', icon: 'pi pi-pencil', command: () => navigate('/mis-anotaciones') },
    { label: 'Cerrar Sesión', icon: 'pi pi-sign-out', command: () => logout(), className: 'text-danger' },
    { separator: true },
    { label: isDarkMode ? 'Modo Claro' : 'Modo Oscuro', icon: `pi ${isDarkMode ? 'pi-sun' : 'pi-moon'}`, command: () => toggleDarkMode() }
  ];

  const end = (
    <div className="d-flex align-items-center gap-2">
      <Button className="d-none d-md-flex" icon={`pi ${isDarkMode ? 'pi-sun' : 'pi-moon'}`} rounded text onClick={toggleDarkMode} tooltip={isDarkMode ? 'Modo Claro' : 'Modo Oscuro'} tooltipOptions={{ position: 'bottom' }} />
      
      <form onSubmit={handleSearchSubmit} className="d-none d-md-block ms-2">
        <IconField iconPosition="left">
          <InputIcon className="pi pi-search"> </InputIcon>
          <InputText placeholder="Buscar libros..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="p-inputtext-sm rounded-pill" />
        </IconField>
      </form>

      {isAuthenticated ? (
        <div className="d-flex align-items-center gap-3 ms-3">
          <NotificationsDropdown />
          <Menu model={userMenuItems} popup ref={userMenuRef} id="popup_menu_right" popupAlignment="right" appendTo={document.body} baseZIndex={2000} style={{ zIndex: 2000 }} />
          <div className="cursor-pointer" onClick={(event) => userMenuRef.current?.toggle(event)} aria-controls="popup_menu_right" aria-haspopup style={{ cursor: 'pointer' }}>
            {user?.avatarUrl ? (
              <Avatar image={user.avatarUrl} shape="circle" className="shadow-sm" />
            ) : (
              <Avatar label={user?.username ? user.username.charAt(0).toUpperCase() : '?'} shape="circle" className="bg-secondary text-white shadow-sm" />
            )}
          </div>
        </div>
      ) : (
        <div className="d-flex gap-2 ms-3">
          <Button label="Iniciar Sesión" text onClick={() => navigate('/login')} size="small" />
          <Button label="Registrarse" onClick={() => navigate('/register')} size="small" />
        </div>
      )}
    </div>
  );

  return (
    <div className="sticky-top shadow-sm" style={{ backgroundColor: 'var(--surface-card)', zIndex: 990 }}>
      {showParrot && (
        <>
          <style>
            {`
              @keyframes flyParrot {
                0% { transform: translate(-20vw, 50vh) scale(1) rotate(10deg); }
                25% { transform: translate(30vw, 30vh) scale(1.5) rotate(-10deg); }
                50% { transform: translate(60vw, 60vh) scale(1.5) rotate(15deg); }
                75% { transform: translate(90vw, 20vh) scale(2) rotate(-20deg); }
                100% { transform: translate(120vw, 40vh) scale(1) rotate(10deg); }
              }
              @keyframes flapWings {
                0% { transform: scaleX(-1) scaleY(1) rotate(0deg); }
                50% { transform: scaleX(-1) scaleY(0.8) rotate(10deg); }
                100% { transform: scaleX(-1) scaleY(1) rotate(0deg); }
              }
              .parrot-animation {
                position: fixed;
                top: 0;
                left: 0;
                font-size: 5rem;
                z-index: 9999;
                animation: flyParrot 3s linear forwards;
                pointer-events: none;
              }
              .parrot-flap {
                display: inline-block;
                animation: flapWings 0.25s infinite;
                transform-origin: center;
              }
            `}
          </style>
          <div className="parrot-animation"><span className="parrot-flap">🦜</span></div>
        </>
      )}
      <div className="container">
        <Menubar model={items} start={start} end={end} className="border-0 rounded-0 px-0 py-2 bg-transparent align-items-center" />
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function MainLayout() {
  const location = useLocation();
  const showSidebar = !location.pathname.startsWith('/read/');

  return (
    <div className="d-flex flex-column vh-100" style={{ backgroundColor: 'var(--surface-ground)', color: 'var(--text-color)' }}>
      <Navigation />
      <main className="d-flex flex-grow-1 overflow-hidden">
        <div className="flex-grow-1 d-flex flex-column overflow-auto">
          <div className="flex-grow-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/catalog" element={<ProtectedRoute><Catalog /></ProtectedRoute>} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/upload" element={<ProtectedRoute><div className="p-4"><UploadBookForm /></div></ProtectedRoute>} />
              <Route path="/read/:bookId" element={<ErrorBoundary><ReaderInterface /></ErrorBoundary>} />
              <Route path="/book/:id" element={<BookPresentation />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/profile/edit" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/profile/:id" element={<UserProfile />} />
              <Route path="/requests" element={<ProtectedRoute><FriendRequestsPage /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
              <Route path="/mis-anotaciones" element={<ProtectedRoute><MyAnnotations /></ProtectedRoute>} />
            </Routes>
          </div>
          {showSidebar && (
            <footer className="w-100 text-center py-3 border-top mt-auto" style={{ backgroundColor: 'var(--surface-card)', color: 'var(--text-color-secondary)' }}>
              &copy; {new Date().getFullYear()} Lectura Colaborativa. Todos los derechos reservados.
            </footer>
          )}
        </div>
        {showSidebar && <FriendsSidebar />}
      </main>
    </div>
  );
}

function App() {
  return (
    <DialogProvider>
      <AuthProvider>
        <Router>
          <MainLayout />
        </Router>
      </AuthProvider>
    </DialogProvider>
  );
}

export default App;
