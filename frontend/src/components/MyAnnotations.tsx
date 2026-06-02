import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Dropdown } from 'primereact/dropdown';
import { Link, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const MyAnnotations: React.FC = () => {
    const { token, isAuthenticated } = useAuth();
    const [booksData, setBooksData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<string>('all');
    const [sortOrder, setSortOrder] = useState<string>('desc');
    const navigate = useNavigate();

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        const fetchAnnotations = async () => {
            try {
                const res = await fetch('/api/auth/me/annotations', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setBooksData(data);
                }
            } catch (err) {
                console.error('Error fetching my annotations', err);
            } finally {
                setLoading(false);
            }
        };

        fetchAnnotations();
    }, [isAuthenticated, token, navigate]);

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center vh-100 w-100 position-fixed top-0 start-0" style={{ backgroundColor: 'var(--surface-ground)', zIndex: 1000 }}>
                <div className="text-center">
                    <i className="pi pi-spin pi-spinner text-primary mb-3" style={{ fontSize: '3rem' }}></i>
                    <h5 className="text-secondary fw-medium">Cargando tus anotaciones...</h5>
                </div>
            </div>
        );
    }

    const typeOptions = [
        { label: 'Todos', value: 'all' },
        { label: 'Solo Resaltados', value: 'highlights' },
        { label: 'Solo Comentarios', value: 'comments' }
    ];

    const sortOptions = [
        { label: 'Más recientes primero', value: 'desc' },
        { label: 'Más antiguos primero', value: 'asc' }
    ];

    const renderCatalog = () => {
        if (booksData.length === 0) {
            return (
                <div className="text-center py-5 bg-white rounded-4 border border-secondary border-opacity-25 shadow-sm">
                    <i className="pi pi-book text-secondary mb-3" style={{ fontSize: '3rem', opacity: 0.5 }}></i>
                    <h4 className="fw-bold text-dark mb-2">Aún no has hecho anotaciones</h4>
                    <p className="text-secondary mb-4">Empieza a leer un libro y subraya o comenta lo que más te guste.</p>
                    <Link to="/catalog" className="btn btn-primary rounded-pill px-4 py-2 fw-bold shadow-sm">
                        Ir al Catálogo
                    </Link>
                </div>
            );
        }

        return (
            <div className="row g-4">
                {booksData.map((bookGroup: any) => (
                    <div key={bookGroup.book.id} className="col-12 col-sm-6 col-md-4">
                        <div className="bg-white rounded-4 shadow-sm border border-secondary border-opacity-10 overflow-hidden h-100 d-flex flex-column card-hover-effect">
                            <div className="p-4 d-flex flex-column align-items-center text-center flex-grow-1">
                                <div className="shadow-sm rounded overflow-hidden mb-3" style={{ width: '100px', height: '140px' }}>
                                    {bookGroup.book.coverUrl ? (
                                        <img src={bookGroup.book.coverUrl.startsWith('http') || bookGroup.book.coverUrl.startsWith('/') ? bookGroup.book.coverUrl : `/${bookGroup.book.coverUrl}`} alt={bookGroup.book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <div className="bg-secondary bg-opacity-25 w-100 h-100 d-flex align-items-center justify-content-center">
                                            <i className="pi pi-book text-secondary" style={{ fontSize: '2rem' }}></i>
                                        </div>
                                    )}
                                </div>
                                <h5 className="fw-bold text-dark mb-1">{bookGroup.book.title}</h5>
                                <p className="text-secondary small fw-medium mb-0">{bookGroup.book.author || 'Autor Desconocido'}</p>
                                <span className="badge bg-primary bg-opacity-10 text-primary px-3 py-2 rounded-pill mt-3">
                                    {bookGroup.annotations.length} anotacion{bookGroup.annotations.length !== 1 && 'es'}
                                </span>
                            </div>
                            <div className="p-3 border-top border-secondary border-opacity-10 bg-light">
                                <button 
                                    className="btn btn-primary w-100 rounded-3 fw-bold shadow-sm"
                                    onClick={() => {
                                        setSelectedBookId(bookGroup.book.id);
                                        setFilterType('all');
                                        setSortOrder('desc');
                                    }}
                                >
                                    Ver mis anotaciones
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderBookDetails = () => {
        const bookGroup = booksData.find(g => g.book.id === selectedBookId);
        if (!bookGroup) return null;

        let filteredAnnotations = [...bookGroup.annotations];
        if (filterType === 'highlights') {
            filteredAnnotations = filteredAnnotations.filter(a => !a.comments || a.comments.length === 0);
        } else if (filterType === 'comments') {
            filteredAnnotations = filteredAnnotations.filter(a => a.comments && a.comments.length > 0);
        }

        filteredAnnotations.sort((a, b) => {
            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();
            return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });

        const exportToPDF = (annotations: any[], bookTitle: string) => {
            const doc = new jsPDF();
            doc.setFontSize(16);
            doc.text(`Anotaciones: ${bookTitle}`, 14, 20);
            
            const tableColumn = ["Tipo", "Fecha", "Texto", "Comentario"];
            const tableRows: any[] = [];

            annotations.forEach(anno => {
                const hasComment = anno.comments && anno.comments.length > 0;
                const type = hasComment ? 'Comentario' : 'Resaltado';
                const date = new Date(anno.createdAt).toLocaleDateString();
                const text = anno.text;
                const comment = hasComment ? anno.comments[0].content : '';
                tableRows.push([type, date, text, comment]);
            });

            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 30,
            });

            doc.save(`Anotaciones_${bookTitle.replace(/\s+/g, '_')}.pdf`);
        };

        const exportToWord = (annotations: any[], bookTitle: string) => {
            const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Anotaciones</title></head><body>";
            const footer = "</body></html>";
            let html = `<h1>Anotaciones: ${bookTitle}</h1>`;
            
            annotations.forEach(anno => {
                const hasComment = anno.comments && anno.comments.length > 0;
                const date = new Date(anno.createdAt).toLocaleDateString();
                html += `<div style="margin-top: 15px;"><strong>${hasComment ? 'Comentario' : 'Resaltado'}</strong> - <em>${date}</em></div>`;
                html += `<blockquote style="border-left: 2px solid #ccc; padding-left: 10px; color: #555;">"${anno.text}"</blockquote>`;
                if (hasComment) {
                    html += `<p><strong>Comentario:</strong> ${anno.comments[0].content}</p>`;
                }
                html += `<hr/>`;
            });
            
            const sourceHTML = header + html + footer;
            const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
            const fileDownload = document.createElement("a");
            document.body.appendChild(fileDownload);
            fileDownload.href = source;
            fileDownload.download = `Anotaciones_${bookTitle.replace(/\s+/g, '_')}.doc`;
            fileDownload.click();
            document.body.removeChild(fileDownload);
        };

        return (
            <div>
                <button 
                    className="btn btn-light border border-secondary border-opacity-25 text-dark fw-bold rounded-pill mb-4 px-3 shadow-sm d-inline-flex align-items-center gap-2 transition-colors hover:bg-secondary hover:bg-opacity-10"
                    onClick={() => setSelectedBookId(null)}
                >
                    <i className="pi pi-arrow-left"></i> Volver a mis libros
                </button>

                <div className="bg-white rounded-4 shadow-sm border border-secondary border-opacity-10 overflow-hidden mb-4">
                    <Link to={`/read/${bookGroup.book.id}`} className="text-decoration-none">
                        <div className="d-flex align-items-center gap-4 p-4 bg-light border-bottom border-secondary border-opacity-10 card-hover-effect transition-colors">
                            <div className="shadow-sm rounded overflow-hidden flex-shrink-0" style={{ width: '60px', height: '85px' }}>
                                {bookGroup.book.coverUrl ? (
                                    <img src={bookGroup.book.coverUrl.startsWith('http') || bookGroup.book.coverUrl.startsWith('/') ? bookGroup.book.coverUrl : `/${bookGroup.book.coverUrl}`} alt={bookGroup.book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div className="bg-secondary bg-opacity-25 w-100 h-100 d-flex align-items-center justify-content-center">
                                        <i className="pi pi-book text-secondary"></i>
                                    </div>
                                )}
                            </div>
                            <div>
                                <h4 className="fw-bold text-dark m-0 mb-1">{bookGroup.book.title}</h4>
                                <p className="text-secondary m-0 small fw-medium">{bookGroup.book.author || 'Autor Desconocido'}</p>
                            </div>
                            <div className="ms-auto">
                                <span className="badge bg-primary bg-opacity-10 text-primary px-3 py-2 rounded-pill">
                                    {bookGroup.annotations.length} total
                                </span>
                            </div>
                        </div>
                    </Link>
                </div>

                <div className="d-flex flex-column flex-md-row gap-3 mb-4 bg-white p-3 rounded-4 shadow-sm border border-secondary border-opacity-10">
                    <div className="d-flex flex-column flex-grow-1">
                        <label className="small fw-bold text-secondary mb-1">Filtrar por Tipo</label>
                        <Dropdown 
                            value={filterType} 
                            options={typeOptions} 
                            onChange={(e) => setFilterType(e.value)} 
                            className="w-100 d-flex align-items-center m-0" 
                            pt={{ 
                                root: { className: 'rounded-3 shadow-none border-secondary border-opacity-25 w-100 h-100' },
                                input: { className: 'p-2 m-0 w-100 text-start align-self-center' },
                                panel: { className: 'p-0 m-0' },
                                list: { className: 'p-0 m-0' },
                                item: { className: 'p-3 m-0' }
                            }}
                        />
                    </div>
                    <div className="d-flex flex-column flex-grow-1">
                        <label className="small fw-bold text-secondary mb-1">Ordenar por Fecha</label>
                        <Dropdown 
                            value={sortOrder} 
                            options={sortOptions} 
                            onChange={(e) => setSortOrder(e.value)} 
                            className="w-100 d-flex align-items-center m-0" 
                            pt={{ 
                                root: { className: 'rounded-3 shadow-none border-secondary border-opacity-25 w-100 h-100' },
                                input: { className: 'p-2 m-0 w-100 text-start align-self-center' },
                                panel: { className: 'p-0 m-0' },
                                list: { className: 'p-0 m-0' },
                                item: { className: 'p-3 m-0' }
                            }}
                        />
                    </div>
                    <div className="d-flex align-items-end ms-md-auto mt-3 mt-md-0">
                        <div className="d-flex gap-2 w-100">
                            <button 
                                className="btn btn-outline-danger flex-grow-1 flex-md-grow-0 rounded-3 shadow-sm fw-bold d-flex align-items-center justify-content-center gap-2 px-3 py-2"
                                onClick={() => exportToPDF(filteredAnnotations, bookGroup.book.title)}
                                disabled={filteredAnnotations.length === 0}
                            >
                                <i className="pi pi-file-pdf"></i> PDF
                            </button>
                            <button 
                                className="btn btn-outline-primary flex-grow-1 flex-md-grow-0 rounded-3 shadow-sm fw-bold d-flex align-items-center justify-content-center gap-2 px-3 py-2"
                                onClick={() => exportToWord(filteredAnnotations, bookGroup.book.title)}
                                disabled={filteredAnnotations.length === 0}
                            >
                                <i className="pi pi-file-word"></i> Word
                            </button>
                        </div>
                    </div>
                </div>

                <div className="d-flex flex-column gap-3">
                    {filteredAnnotations.length === 0 ? (
                        <div className="text-center py-5 text-secondary">
                            <i className="pi pi-filter mb-2" style={{ fontSize: '2rem' }}></i>
                            <p className="m-0">No se encontraron anotaciones con estos filtros.</p>
                        </div>
                    ) : (
                        filteredAnnotations.map((anno: any) => {
                            const hasComment = anno.comments && anno.comments.length > 0;
                            const isPublic = anno.isPublic !== false;
                            
                            return (
                                <div key={anno.id} className="p-3 rounded-4 bg-white shadow-sm border border-secondary border-opacity-10 transition-colors hover:bg-light">
                                    <div className="d-flex align-items-center gap-2 mb-2">
                                        <div className={`small fw-bold px-2 py-1 rounded ${hasComment ? 'bg-primary bg-opacity-10 text-primary' : 'bg-secondary bg-opacity-10 text-secondary'}`}>
                                            {hasComment ? 'Comentario' : 'Resaltado'}
                                        </div>
                                        <span className="text-secondary text-[11px]">
                                            {anno.sectionIndex ? `Página ${anno.sectionIndex}` : ''} • {new Date(anno.createdAt).toLocaleDateString()}
                                        </span>
                                        <div className="ms-auto">
                                            {isPublic ? (
                                                <span className="badge border border-primary text-primary bg-primary bg-opacity-10 rounded-pill" title="Anotación Pública">
                                                    <i className="pi pi-globe me-1" style={{ fontSize: '10px' }}></i> Público
                                                </span>
                                            ) : (
                                                <span className="badge border border-secondary text-secondary bg-secondary bg-opacity-10 rounded-pill" title="Anotación Privada">
                                                    <i className="pi pi-lock me-1" style={{ fontSize: '10px' }}></i> Privado
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="ps-2 border-start border-3 border-primary border-opacity-25 mt-3 mb-2 ms-1">
                                        <p className="small text-dark fst-italic m-0">"{anno.text}"</p>
                                    </div>

                                    {hasComment && (
                                        <div className="mt-3 p-3 bg-light rounded-3 border border-secondary border-opacity-10 shadow-sm d-flex align-items-start gap-2">
                                            <i className="pi pi-comment text-primary mt-1"></i>
                                            <p className="m-0 text-dark small fw-medium">{anno.comments[0].content}</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="container py-5 max-w-4xl mx-auto" style={{ maxWidth: '900px' }}>
            <div className="d-flex align-items-center mb-5 gap-3 border-bottom pb-3 border-secondary border-opacity-25">
                <i className="pi pi-pencil text-primary" style={{ fontSize: '2rem' }}></i>
                <div>
                    <h1 className="fw-bold m-0 text-dark">Mis Anotaciones</h1>
                    <p className="text-secondary m-0 mt-1">
                        {selectedBookId ? 'Explora y filtra tus anotaciones en este libro.' : 'Selecciona un libro para ver todas tus anotaciones.'}
                    </p>
                </div>
            </div>
            {selectedBookId ? renderBookDetails() : renderCatalog()}
        </div>
    );
};
