import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Avatar } from 'primereact/avatar';
import { Badge } from 'primereact/badge';
import { Dropdown } from 'primereact/dropdown';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Paginator } from 'primereact/paginator';
import { ListManagerModal } from './ListManagerModal';

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const initialQ = searchParams.get('q') || '';
  const initialAuthor = searchParams.get('author') || '';
  const initialCreator = searchParams.get('creator') || '';
  const initialSortBy = searchParams.get('sortBy') || 'date_desc';
  const initialTags = searchParams.get('tags') ? searchParams.get('tags')!.split(',') : [];

  const [query, setQuery] = useState(initialQ);
  const [author, setAuthor] = useState(initialAuthor);
  const [creator, setCreator] = useState(initialCreator);
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialTags);
  const [availableTags, setAvailableTags] = useState<any[]>([]);

  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { token, isAuthenticated } = useAuth();
  
  const [showFilters, setShowFilters] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const [first, setFirst] = useState(0);
  const rows = 10;
  const [listModalOpen, setListModalOpen] = useState(false);
  const [selectedBookForList, setSelectedBookForList] = useState<string | null>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetch('/api/tags', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => setAvailableTags(data))
      .catch(err => console.error(err));
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      handleSearch();
      
      // Update URL
      const params: any = {};
      if (query) params.q = query;
      if (author) params.author = author;
      if (creator) params.creator = creator;
      if (sortBy) params.sortBy = sortBy;
      if (selectedTags.length > 0) params.tags = selectedTags.join(',');
      
      setSearchParams(params, { replace: true });
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query, author, creator, sortBy, selectedTags]);

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const clearFilters = () => {
    setQuery('');
    setAuthor('');
    setCreator('');
    setSortBy('date_desc');
    setSelectedTags([]);
    setFirst(0);
  };

  const toggleFavorite = async (book: any, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isAuthenticated || !token) return;
      try {
          const method = book.isFavorited ? 'DELETE' : 'POST';
          const res = await fetch(`/api/books/${book.id}/favorite`, {
              method,
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
              setResults(results.map(b => b.id === book.id ? { ...b, isFavorited: !b.isFavorited, favoritesCount: b.isFavorited ? b.favoritesCount - 1 : b.favoritesCount + 1 } : b));
          }
      } catch (err) {
          console.error('Error toggling favorite:', err);
      }
  };

  const openListModal = (bookId: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isAuthenticated) return;
      setSelectedBookForList(bookId);
      setListModalOpen(true);
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.append('q', query.trim());
      if (author.trim()) params.append('author', author.trim());
      if (creator.trim()) params.append('creator', creator.trim());
      if (sortBy) params.append('sortBy', sortBy);
      if (selectedTags.length > 0) params.append('tags', selectedTags.join(','));

      const res = await fetch(`/api/books/search?${params.toString()}`, {
        headers: {
          'Authorization': isAuthenticated ? `Bearer ${token}` : ''
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        setResults(data);
        setFirst(0);
      }
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  const sortOptions = [
    { label: 'Más recientes', value: 'date_desc' },
    { label: 'Más antiguos', value: 'date_asc' },
    { label: 'Más populares', value: 'popular' }
  ];

  return (
    <div className="container-fluid py-5 min-vh-100" style={{ backgroundColor: 'var(--surface-ground)' }}>
      <style>
        {`
          @media (min-width: 992px) {
            .col-lg-custom-5 {
              flex: 0 0 auto;
              width: 20%;
            }
          }
        `}
      </style>
      <div className="container" style={{ maxWidth: '1200px' }}>
        <div className="d-flex align-items-center mb-4 gap-3 justify-content-between">
            <div className="d-flex align-items-center gap-3">
                <i className="pi pi-book text-primary" style={{ fontSize: '2.5rem' }}></i>
                <div>
                    <h1 className="display-6 fw-bolder m-0 text-dark" style={{ fontSize: isMobile ? '1.8rem' : 'calc(1.375rem + 1.5vw)' }}>Catálogo de archivos</h1>
                    <p className="text-secondary m-0">Explora todos los libros compartidos en la plataforma.</p>
                </div>
            </div>
            {isAuthenticated && (
                <Button
                    label="Crear archivo"
                    icon="pi pi-plus"
                    className="p-button-lg p-button-raised shadow d-none d-md-flex"
                    onClick={() => navigate('/upload')}
                />
            )}
        </div>
        {isAuthenticated && isMobile && (
            <div className="mb-4">
                <Button
                    label="Crear archivo"
                    icon="pi pi-plus"
                    className="p-button-raised shadow w-100"
                    onClick={() => navigate('/upload')}
                />
            </div>
        )}
        
        <Card className="mb-5 shadow-sm border-0 rounded-4">
            <div className="d-flex flex-column gap-3">
                <div className="p-inputgroup border rounded shadow-sm">
                    <span className="p-inputgroup-addon bg-white border-0">
                        <i className="pi pi-search text-primary"></i>
                    </span>
                    <InputText 
                        placeholder={isMobile ? "Título" : "Buscar por título del archivo..."}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="p-inputtext-lg border-0 shadow-none w-100"
                    />
                    <Button 
                        icon="pi pi-filter" 
                        label={isMobile ? "" : "Filtros"} 
                        severity={showFilters ? 'primary' : 'secondary'} 
                        outlined={!showFilters}
                        onClick={() => setShowFilters(!showFilters)}
                        className={`rounded-end ${isMobile ? 'px-3' : 'px-4'}`}
                        title="Filtros"
                    />
                </div>

                {showFilters && (
                    <div className="p-3 bg-light rounded-3 border border-secondary border-opacity-10 mt-2">
                        <div className="row g-3">
                            <div className="col-12 col-md-4">
                                <label className="small fw-bold text-secondary mb-1">Autor</label>
                                <InputText 
                                    placeholder="Nombre del autor..." 
                                    value={author} 
                                    onChange={(e) => setAuthor(e.target.value)} 
                                    className="w-100 p-2"
                                />
                            </div>
                            <div className="col-12 col-md-4">
                                <label className="small fw-bold text-secondary mb-1">Subido por (Usuario)</label>
                                <InputText 
                                    placeholder="Nombre de usuario..." 
                                    value={creator} 
                                    onChange={(e) => setCreator(e.target.value)} 
                                    className="w-100 p-2"
                                />
                            </div>
                            <div className="col-12 col-md-4">
                                <label className="small fw-bold text-secondary mb-1">Ordenar por</label>
                                <Dropdown 
                                    value={sortBy} 
                                    options={sortOptions} 
                                    onChange={(e) => setSortBy(e.value)} 
                                    className="w-100" 
                                    pt={{ root: { className: 'w-100' }, input: { className: 'p-2 w-100' } }}
                                />
                            </div>
                        </div>

                        {availableTags.length > 0 && (
                            <div className="mt-4">
                                <label className="small fw-bold text-secondary mb-2 d-block">Etiquetas</label>
                                <div className="d-flex flex-wrap gap-2">
                                    {availableTags.map(tag => (
                                        <Button
                                            key={tag.id}
                                            label={tag.name}
                                            outlined={!selectedTags.includes(tag.id)}
                                            severity={selectedTags.includes(tag.id) ? 'primary' : 'secondary'}
                                            onClick={() => toggleTag(tag.id)}
                                            className="p-button-sm p-button-rounded rounded-pill"
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        <div className="d-flex justify-content-end mt-4 pt-3 border-top border-secondary border-opacity-10">
                            <Button label="Limpiar Filtros" icon="pi pi-times" text severity="danger" onClick={clearFilters} />
                        </div>
                    </div>
                )}
            </div>
        </Card>

        <div>
          {loading ? (
            <div className="text-center py-5 d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '300px' }}>
              <ProgressSpinner />
              <p className="mt-3 text-secondary fw-bold">Cargando catálogo...</p>
            </div>
          ) : results.length > 0 ? (
            <>
              <div className="row g-4">
                  {results.slice(first, first + rows).map(book => (
                    <div key={book.id} className="col-12 col-sm-6 col-md-4 col-lg-custom-5">
                    <Link to={`/book/${book.id}`} className="text-decoration-none">
                      <Card 
                        className="shadow-sm border-0 h-100 card-hover-effect overflow-hidden p-0"
                        pt={{ body: { className: 'p-0 d-flex flex-column h-100' }, content: { className: 'p-0 m-0 flex-grow-1 d-flex flex-column' } }}
                      >
                        <div className="position-relative">
                            {book.coverUrl ? (
                                <img src={book.coverUrl.startsWith('http') || book.coverUrl.startsWith('/') ? book.coverUrl : `/${book.coverUrl}`} alt={book.title} className="w-100" style={{ height: '160px', objectFit: 'cover' }} />
                            ) : (
                                <div className="w-100 d-flex align-items-center justify-content-center bg-secondary bg-opacity-10" style={{ height: '160px' }}>
                                    <i className="pi pi-book text-secondary" style={{ fontSize: '3rem' }}></i>
                                </div>
                            )}
                            {book.isFavorited && (
                                <div className="position-absolute top-0 end-0 m-2">
                                    <i className="pi pi-heart-fill text-danger fs-4 drop-shadow"></i>
                                </div>
                            )}
                        </div>
                        <div className="px-3 pt-3 pb-2 d-flex flex-column flex-grow-1 bg-white">
                          <h5 className="fw-bold text-dark mb-1 text-truncate" title={book.title}>{book.title}</h5>
                          <p className="text-secondary small fw-medium mb-2 text-truncate" title={book.author}>{book.author || 'Autor Desconocido'}</p>
                          
                          {book.tags && book.tags.length > 0 && (
                            <div className="d-flex flex-wrap gap-1 mb-3">
                              {book.tags.slice(0, 2).map((tag: any) => (
                                <Badge key={tag.id} value={tag.name} severity="info" className="bg-light text-secondary border text-[10px]" />
                              ))}
                              {book.tags.length > 2 && (
                                <Badge value={`+${book.tags.length - 2}`} severity="secondary" className="bg-light text-secondary border text-[10px]" />
                              )}
                            </div>
                          )}
                          
                          {book.creator && (
                            <div className="d-flex align-items-center gap-2 mt-auto pt-2 border-top border-secondary border-opacity-10">
                              {book.creator.avatarUrl ? (
                                <Avatar image={book.creator.avatarUrl} shape="circle" size="small" />
                              ) : (
                                <Avatar label={book.creator.username.charAt(0).toUpperCase()} shape="circle" size="small" className="bg-primary text-white" style={{ width: '24px', height: '24px', fontSize: '0.8rem' }} />
                              )}
                              <span className="small text-secondary fw-bold text-truncate" style={{ fontSize: '0.75rem' }}>{book.creator.username}</span>
                            </div>
                          )}
                          {isAuthenticated && (
                              <div className="d-flex justify-content-end gap-2 mt-auto pt-2 border-top border-secondary border-opacity-10">
                                  <Button 
                                      icon={book.isFavorited ? "pi pi-heart-fill" : "pi pi-heart"} 
                                      rounded 
                                      text 
                                      severity={book.isFavorited ? "danger" : "secondary"} 
                                      aria-label="Favorito" 
                                      onClick={(e) => toggleFavorite(book, e)} 
                                  />
                                  <Button 
                                      icon="pi pi-list" 
                                      rounded 
                                      text 
                                      severity="secondary" 
                                      aria-label="Guardar en lista" 
                                      onClick={(e) => openListModal(book.id, e)} 
                                  />
                              </div>
                          )}
                        </div>
                      </Card>
                    </Link>
                  </div>
                ))}
              </div>
              {results.length > rows && (
                  <Paginator first={first} rows={rows} totalRecords={results.length} onPageChange={(e) => setFirst(e.first)} className="mt-4 bg-transparent border-0" />
              )}
            </>
          ) : (
              <div className="text-center py-5 bg-white rounded-4 shadow-sm border border-secondary border-opacity-10">
                <i className="pi pi-search text-secondary mb-3" style={{ fontSize: '3rem', opacity: 0.5 }}></i>
                <h4 className="fw-bold text-dark">No se encontraron libros</h4>
                <p className="text-secondary">Prueba con otros términos, autores o etiquetas en los filtros.</p>
                <Button label="Limpiar Filtros" severity="secondary" outlined onClick={clearFilters} className="mt-3 rounded-pill" />
              </div>
          )}
        </div>
      </div>
      <ListManagerModal
          isOpen={listModalOpen}
          onClose={() => setListModalOpen(false)}
          bookId={selectedBookForList}
      />
    </div>
  );
}
