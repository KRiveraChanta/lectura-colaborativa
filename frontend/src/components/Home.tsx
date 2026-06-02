import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDialog } from './ui/DialogProvider';
import { ListManagerModal } from './ListManagerModal';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Badge } from 'primereact/badge';
import { Avatar } from 'primereact/avatar';

const heroSlides = [
  {
    image: '/images/hero_bg_collab.png',
    title: 'Lectura Colaborativa en Tiempo Real',
    description: 'Lee con tus amigos, compartan pensamientos y comenten los pasajes más interesantes mientras avanzan juntos.',
    icon: 'pi pi-users text-primary'
  },
  {
    image: '/images/hero_bg_progress.png',
    title: 'No te quedes atrás',
    description: 'Mira exactamente por dónde van tus amigos en la línea de tiempo. Motívense mutuamente a seguir leyendo.',
    icon: 'pi pi-clock text-info'
  },
  {
    image: '/images/hero_bg_reader.png',
    title: 'Una experiencia de lectura fluida',
    description: 'Personaliza tu entorno con el modo oscuro, modo enfoque y herramientas integradas para una inmersión total.',
    icon: 'pi pi-book text-primary'
  }
];

const testimonials = [
  {
    name: 'Carlos M.',
    role: 'Estudiante Universitario',
    content: 'Desde que uso esta plataforma, leer ensayos y novelas con mis compañeros de clase es mucho más divertido. Las discusiones en los márgenes son geniales.',
    rating: 5
  },
  {
    name: 'Ana G.',
    role: 'Lectora Ávida',
    content: 'Me encanta poder ver por qué página van mis amigas. Se ha convertido en nuestro club de lectura virtual favorito.',
    rating: 5
  },
  {
    name: 'Luis P.',
    role: 'Profesor',
    content: 'Subo mis propios materiales y mis alumnos pueden leerlos. Es una forma fantástica de fomentar la lectura grupal.',
    rating: 4
  }
];

export const Home = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [recentBooks, setRecentBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Touch swipe state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const navigate = useNavigate();
  const { token, isAuthenticated } = useAuth();
  const { alert } = useDialog();
  
  const [listModalOpen, setListModalOpen] = useState(false);
  const [selectedBookForList, setSelectedBookForList] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchPublicBooks = async () => {
      try {
        const headers: any = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch('/api/books/search?q=&publicOnly=true', { headers, cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          setRecentBooks(data.slice(0, 8));
        }
      } catch (error) {
        console.error('Error fetching public books:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPublicBooks();
  }, [token]);

  const toggleFavorite = async (book: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
        alert({ title: 'Acceso Requerido', message: 'INGRESE CON UNA CUENTA', type: 'info', showAuthButtons: true });
        return;
    }
    try {
        const method = book.isFavorited ? 'DELETE' : 'POST';
        const res = await fetch(`/api/books/${book.id}/favorite`, {
            method,
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            setRecentBooks(prev => prev.map(b => 
                b.id === book.id ? { ...b, isFavorited: !b.isFavorited } : b
            ));
        }
    } catch (err) {
        console.error('Error toggling favorite', err);
    }
  };

  const openListModal = (bookId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
        alert({ title: 'Acceso Requerido', message: 'INGRESE CON UNA CUENTA', type: 'info', showAuthButtons: true });
        return;
    }
    setSelectedBookForList(bookId);
    setListModalOpen(true);
  };

  const handleBookClick = (bookId: string) => {
    navigate(`/book/${bookId}`);
  };

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    
    if (isLeftSwipe) nextSlide();
    if (isRightSwipe) prevSlide();
  };

  return (
    <div className="w-100 flex-grow-1 overflow-auto" style={{ backgroundColor: 'var(--surface-ground)' }}>
      
      {/* Hero Section */}
      <section 
        className="position-relative overflow-hidden mx-auto hero-carousel" 
        style={{ height: '600px' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {heroSlides.map((slide, index) => (
          <div 
            key={index}
            className={`position-absolute top-0 start-0 w-100 h-100 transition-all ${index === currentSlide ? 'opacity-100 z-2' : 'opacity-0 z-1'}`}
            style={{ transitionDuration: '1s' }}
          >
            <div 
              className="position-absolute top-0 start-0 w-100 h-100 bg-cover bg-center"
              style={{ backgroundImage: `url(${slide.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
            >
              <div className="position-absolute top-0 start-0 w-100 h-100 bg-dark" style={{ opacity: 0.7 }}></div>
            </div>
            
            <div className="position-relative z-3 h-100 d-flex align-items-center justify-content-center text-center px-4">
              <div className="max-w-3xl mx-auto d-flex flex-column align-items-center">
                <i className={`${slide.icon} mb-4`} style={{ fontSize: '3rem' }}></i>
                <h1 className="display-4 fw-bolder text-white mb-4 text-shadow">
                  {slide.title}
                </h1>
                <p className="lead text-light mb-5">
                  {slide.description}
                </p>
                <div className="d-flex gap-3">
                  <Button 
                    label="Explorar Catálogo" 
                    className="p-button-lg p-button-raised bg-white text-primary border-white"
                    onClick={() => navigate('/search')}
                  />
                  <Button 
                    label="Regístrate Gratis" 
                    className="p-button-lg p-button-raised p-button-primary"
                    onClick={() => navigate('/register')}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Controls */}
        <Button icon="pi pi-chevron-left" rounded text aria-label="Previous" onClick={prevSlide} className="position-absolute start-0 top-50 translate-middle-y ms-3 z-3 text-white d-none d-md-flex" style={{ width: '3rem', height: '3rem', backgroundColor: 'rgba(0,0,0,0.3)' }} />
        <Button icon="pi pi-chevron-right" rounded text aria-label="Next" onClick={nextSlide} className="position-absolute end-0 top-50 translate-middle-y me-3 z-3 text-white d-none d-md-flex" style={{ width: '3rem', height: '3rem', backgroundColor: 'rgba(0,0,0,0.3)' }} />

        {/* Indicators */}
        <div className="position-absolute bottom-0 start-50 translate-middle-x mb-4 z-3 d-flex gap-2">
          {heroSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className="border-0 rounded-circle"
              style={{ width: '12px', height: '12px', padding: 0, backgroundColor: index === currentSlide ? 'white' : 'rgba(255,255,255,0.5)', transition: 'all 0.3s' }}
            />
          ))}
        </div>
      </section>

      {/* Public Books Section */}
      <section className="py-5 container-fluid" style={{ maxWidth: '1400px' }}>
        <div className="d-flex justify-content-between align-items-end mb-5">
          <div>
            <h2 className="fw-bolder mb-2" style={{ color: 'var(--text-color)' }}>Libros Públicos Recientes</h2>
            <p className="text-secondary mb-0">Descubre historias que la comunidad está compartiendo.</p>
          </div>
          <Link to="/search" className="text-primary fw-bold text-decoration-none d-none d-sm-block">
            Ver todos &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
            <i className="pi pi-spin pi-spinner text-primary" style={{ fontSize: '3rem' }}></i>
          </div>
        ) : recentBooks.length > 0 ? (
          <div className="row g-4">
            {recentBooks.map(book => (
              <div key={book.id} className="col-12 col-sm-6 col-lg-3">
                <Card 
                  className="h-100 shadow-sm border-0 cursor-pointer card-hover-effect"
                  onClick={() => handleBookClick(book.id)}
                  style={{ cursor: 'pointer', transition: 'transform 0.3s, box-shadow 0.3s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = 'var(--surface-500)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = ''; }}
                >
                  <div className="position-relative overflow-hidden rounded-top bg-light" style={{ height: '200px', margin: '-1.25rem -1.25rem 1rem -1.25rem' }}>
                    {book.coverUrl ? (
                      <img src={book.coverUrl} alt={book.title} className="w-100 h-100" style={{ objectFit: 'cover' }} />
                    ) : (
                      <div className="w-100 h-100 d-flex align-items-center justify-content-center bg-primary" style={{ opacity: 0.1 }}>
                        <i className="pi pi-book text-primary" style={{ fontSize: '4rem', opacity: 0.5 }}></i>
                      </div>
                    )}
                    <Badge value="Público" className="position-absolute top-0 start-0 m-2" />
                    
                    {isAuthenticated && (
                      <div className="position-absolute top-0 end-0 m-2 d-flex gap-2">
                        <Button icon="pi pi-bookmark" rounded text severity="secondary" className="bg-white bg-opacity-75 shadow-sm" onClick={(e) => openListModal(book.id, e)} style={{ width: '2rem', height: '2rem' }} />
                        <Button icon={book.isFavorited ? 'pi pi-heart-fill text-danger' : 'pi pi-heart'} rounded text severity="secondary" className="bg-white bg-opacity-75 shadow-sm" onClick={(e) => toggleFavorite(book, e)} style={{ width: '2rem', height: '2rem' }} />
                      </div>
                    )}
                  </div>
                  
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h5 className="fw-bold mb-0 text-truncate" style={{ maxWidth: '80%', color: 'var(--text-color)' }}>{book.title}</h5>
                    {book.allowedUsersCount > 0 && (
                      <div title={`${book.allowedUsersCount} amigo(s) con acceso`} className="d-flex align-items-center gap-1 text-secondary bg-light px-2 rounded-pill border" style={{ fontSize: '12px', padding: '2px 6px' }}>
                        <i className="pi pi-users" style={{ fontSize: '10px' }}></i>
                        <span className="fw-bold">{book.allowedUsersCount}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-secondary small mb-3">{book.author}</p>
                  
                  <div className="d-flex align-items-center justify-content-between pt-3 border-top mt-auto">
                    <div className="d-flex align-items-center gap-2">
                      {book.creator?.avatarUrl ? (
                        <Avatar image={book.creator.avatarUrl} shape="circle" style={{ width: '24px', height: '24px' }} />
                      ) : (
                        <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: '24px', height: '24px', fontSize: '10px' }}>
                          {book.creator?.username?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-secondary" style={{ fontSize: '12px' }}>
                        Por <span className="fw-bold">{book.creator?.username}</span>
                      </span>
                    </div>
                    <Button label="Leer" link className="p-0 text-primary fw-bold" onClick={(e) => { e.stopPropagation(); navigate(`/read/${book.id}`); }} />
                  </div>
                </Card>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-5 border rounded" style={{ backgroundColor: 'var(--surface-card)', borderColor: 'var(--surface-border)' }}>
            <i className="pi pi-book text-secondary mb-3" style={{ fontSize: '3rem' }}></i>
            <h4 className="fw-bold" style={{ color: 'var(--text-color)' }}>Aún no hay libros públicos</h4>
            <p className="text-secondary">Sé el primero en compartir un libro con la comunidad.</p>
          </div>
        )}
      </section>

      {/* Testimonials Section */}
      <section className="py-5 border-top" style={{ backgroundColor: 'var(--surface-section)' }}>
        <div className="container-fluid" style={{ maxWidth: '1400px' }}>
          <div className="text-center mb-5">
            <h2 className="fw-bolder mb-3" style={{ color: 'var(--text-color)' }}>Lo que dicen nuestros lectores</h2>
            <p className="text-secondary lead mx-auto" style={{ maxWidth: '600px' }}>
              Únete a miles de lectores que han transformado su manera de leer y aprender en equipo.
            </p>
          </div>

          <div className="row g-4">
            {testimonials.map((testimonial, idx) => (
              <div key={idx} className="col-12 col-md-4">
                <Card className="h-100 shadow-sm border-0 position-relative">
                  <i className="pi pi-comment position-absolute top-0 end-0 m-4 text-primary" style={{ fontSize: '3rem', zIndex: 0 }}></i>
                  <div className="position-relative z-1">
                    <div className="d-flex gap-1 mb-3">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <i key={i} className="pi pi-star-fill text-warning"></i>
                      ))}
                    </div>
                    <p className="mb-4 fst-italic" style={{ color: 'var(--text-color)' }}>
                      "{testimonial.content}"
                    </p>
                    <div className="d-flex align-items-center gap-3">
                      <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{ width: '48px', height: '48px' }}>
                        {testimonial.name.charAt(0)}
                      </div>
                      <div>
                        <h6 className="fw-bold mb-0" style={{ color: 'var(--text-color)' }}>{testimonial.name}</h6>
                        <small className="text-secondary">{testimonial.role}</small>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ListManagerModal 
        isOpen={listModalOpen} 
        onClose={() => setListModalOpen(false)} 
        bookId={selectedBookForList} 
      />
    </div>
  );
};
