// @ts-nocheck
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useDialog } from './ui/DialogProvider';
import { ListManagerModal } from './ListManagerModal';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Avatar } from 'primereact/avatar';
import { Badge } from 'primereact/badge';
import { InputTextarea } from 'primereact/inputtextarea';
import { Divider } from 'primereact/divider';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';

interface BookDetails {
    id: string;
    title: string;
    author: string;
    description: string;
    coverUrl: string;
    visibility: string;
    format: string;
    isDuplicate: boolean;
    creatorId: string;
    creator: { username: string, avatarUrl?: string } | null;
    originalUploader: { username: string } | null;
    tags: { id: string, name: string }[];
    favoritesCount: number;
    isFavorited: boolean;
    progress: number;
    isOwner: boolean;
    duplicateCount: number;
    duplicators?: { id: string, username: string, avatarUrl?: string }[];
    createdAt?: string;
    allowedUsers?: string[];
}

export function BookPresentation() {
    const { id } = useParams<{ id: string }>();
    const { token, user, isAuthenticated } = useAuth();
    const { isDarkMode } = useTheme();
    const { alert, confirm } = useDialog();
    const navigate = useNavigate();

    const [book, setBook] = useState<BookDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [showListModal, setShowListModal] = useState(false);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState('');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 992);
    const [showAllCommentsModal, setShowAllCommentsModal] = useState(false);
    const [showDuplicatorsModal, setShowDuplicatorsModal] = useState(false);
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [editedDescription, setEditedDescription] = useState('');
    const [isSavingDescription, setIsSavingDescription] = useState(false);

    const [showVisibilityModal, setShowVisibilityModal] = useState(false);
    const [editVisibility, setEditVisibility] = useState('private');
    const [editAllowedUsers, setEditAllowedUsers] = useState<string[]>([]);
    const [friends, setFriends] = useState<any[]>([]);

    const visibilityOptions = [
        { label: 'Público', value: 'public', icon: 'pi pi-globe' },
        { label: 'Privado', value: 'private', icon: 'pi pi-lock' },
        { label: 'Restringido', value: 'restricted', icon: 'pi pi-users' }
    ];

    const visibilityTemplate = (option: any) => {
        if (!option) return null;
        return (
            <div className="d-flex align-items-center gap-2 w-100">
                <i className={option.icon}></i>
                <span>{option.label}</span>
            </div>
        );
    };

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 992);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (id) {
            fetchBookDetails();
            fetchComments();
        }
    }, [id, isAuthenticated, token]);

    const fetchFriends = async () => {
        if (!isAuthenticated || !token) return;
        try {
            const res = await fetch('/api/friends/list', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setFriends(data.map((f: any) => ({
                    label: f.username,
                    value: f.id,
                    avatarUrl: f.avatarUrl
                })));
            }
        } catch (error) {
            console.error('Error fetching friends:', error);
        }
    };

    const openVisibilityModal = () => {
        setEditVisibility(book?.visibility || 'private');
        setEditAllowedUsers(book?.allowedUsers || []);
        fetchFriends();
        setShowVisibilityModal(true);
    };

    const fetchBookDetails = async () => {
        try {
            const headers: any = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch(`/api/books/${id}/details`, { headers });
            if (res.ok) {
                const data = await res.json();
                setBook(data);
                setEditedDescription(data.description || '');
            } else if (res.status === 403) {
                navigate('/');
                alert({ title: 'Acceso Denegado', message: 'No tienes permiso para ver este libro.', type: 'error' });
            }
        } catch (error) {
            console.error('Error fetching book details:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchComments = async () => {
        try {
            const headers: any = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch(`/api/books/${id}/book-comments`, { headers });
            if (res.ok) {
                const data = await res.json();
                setComments(data);
            }
        } catch (error) {
            console.error('Error fetching comments:', error);
        }
    };

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !isAuthenticated) return;

        try {
            const res = await fetch(`/api/books/${id}/book-comments`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content: newComment.trim() })
            });
            if (res.ok) {
                const addedComment = await res.json();
                setComments([addedComment, ...comments]);
                setNewComment('');
            } else {
                const data = await res.json();
                alert({ title: 'Error', message: data.message || 'Error al agregar comentario', type: 'error' });
            }
        } catch (error) {
            console.error('Error adding comment', error);
        }
    };

    const handleAddReply = async (parentId: string, e: React.FormEvent) => {
        e.preventDefault();
        if (!replyContent.trim() || !isAuthenticated) return;

        try {
            const res = await fetch(`/api/books/${id}/book-comments`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content: replyContent.trim(), parentId })
            });
            if (res.ok) {
                const addedComment = await res.json();
                setComments([...comments, addedComment]);
                setReplyingTo(null);
                setReplyContent('');
            } else {
                const data = await res.json();
                alert({ title: 'Error', message: data.message || 'Error al responder', type: 'error' });
            }
        } catch (error) {
            console.error('Error adding reply', error);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        const confirmed = await confirm({
            title: 'Eliminar comentario',
            message: '¿Estás seguro de que deseas eliminar este comentario? Esta acción no se puede deshacer.',
            type: 'warning'
        });
        if (!confirmed) return;

        try {
            const res = await fetch(`/api/books/${id}/book-comments/${commentId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setComments(prev => prev.filter(c => c.id !== commentId && c.parentId !== commentId));
            } else {
                const data = await res.json();
                alert({ title: 'Error', message: data.message || 'No se pudo eliminar', type: 'error' });
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleReaction = async (commentId: string, type: 'like' | 'dislike') => {
        if (!isAuthenticated) {
            alert({ title: 'Acceso Requerido', message: 'INGRESE CON UNA CUENTA', type: 'info' });
            return;
        }

        try {
            const res = await fetch(`/api/books/${id}/book-comments/${commentId}/reaction`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ type })
            });
            if (res.ok) {
                setComments(prev => prev.map(c => {
                    if (c.id === commentId) {
                        const isRemoving = c.userReaction === type;
                        const isChanging = c.userReaction && c.userReaction !== type;
                        
                        let newLikes = c.likesCount;
                        let newDislikes = c.dislikesCount;

                        if (isRemoving) {
                            if (type === 'like') newLikes--;
                            else newDislikes--;
                            return { ...c, userReaction: null, likesCount: newLikes, dislikesCount: newDislikes };
                        } else {
                            if (type === 'like') {
                                newLikes++;
                                if (isChanging) newDislikes--;
                            } else {
                                newDislikes++;
                                if (isChanging) newLikes--;
                            }
                            return { ...c, userReaction: type, likesCount: newLikes, dislikesCount: newDislikes };
                        }
                    }
                    return c;
                }));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleToggleFavorite = async () => {
        if (!isAuthenticated) {
            alert({ title: 'Acceso Requerido', message: 'INGRESE CON UNA CUENTA', type: 'info' });
            return;
        }

        try {
            const method = book?.isFavorited ? 'DELETE' : 'POST';
            const res = await fetch(`/api/books/${id}/favorite`, {
                method,
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setBook(prev => prev ? {
                    ...prev,
                    isFavorited: !prev.isFavorited,
                    favoritesCount: prev.isFavorited ? prev.favoritesCount - 1 : prev.favoritesCount + 1
                } : null);
            }
        } catch (error) {
            console.error('Error toggling favorite:', error);
        }
    };

    const handleSaveDescription = async () => {
        setIsSavingDescription(true);
        try {
            const res = await fetch(`/api/books/${id}`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ description: editedDescription })
            });
            if (res.ok) {
                setBook(prev => prev ? { ...prev, description: editedDescription } : null);
                setIsEditingDescription(false);
            } else {
                const data = await res.json();
                alert({ title: 'Error', message: data.message || 'Error al actualizar', type: 'error' });
            }
        } catch (error) {
            console.error(error);
            alert({ title: 'Error', message: 'Error de red', type: 'error' });
        } finally {
            setIsSavingDescription(false);
        }
    };

    const handleUpdateVisibility = async () => {
        try {
            const payload = {
                visibility: editVisibility,
                allowedUsers: (editVisibility === 'restricted' || editVisibility === 'public') ? editAllowedUsers : []
            };
            const res = await fetch(`/api/books/${id}`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setBook(prev => prev ? { ...prev, visibility: editVisibility, allowedUsers: (editVisibility === 'restricted' || editVisibility === 'public') ? editAllowedUsers : [] } : null);
                setShowVisibilityModal(false);
            } else {
                const data = await res.json();
                alert({ title: 'Error', message: data.message || 'Error al actualizar visibilidad', type: 'error' });
            }
        } catch (error) {
            console.error(error);
            alert({ title: 'Error', message: 'Error de red', type: 'error' });
        }
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center min-vh-100">
                <i className="pi pi-spin pi-spinner text-primary" style={{ fontSize: '3rem' }}></i>
            </div>
        );
    }

    if (!book) {
        return (
            <div className="d-flex justify-content-center align-items-center min-vh-100">
                <h3 className="text-secondary fw-bold">Libro no encontrado</h3>
            </div>
        );
    }

    return (
        <div className="container-fluid py-4 px-3 px-md-4 px-xl-5 min-vh-100" style={{ backgroundColor: 'var(--surface-ground)' }}>
            <div className="mx-auto" style={{ maxWidth: '1600px' }}>
                <div className="mb-3">
                    <Button 
                        label="Regresar atrás" 
                        icon="pi pi-arrow-left" 
                        className="p-button-text p-button-secondary p-0 fw-bold" 
                        onClick={() => navigate(-1)} 
                    />
                </div>
                <div className="row">
                    <div className="col-12 col-lg-8 mb-4 mb-lg-0">
                        <Card className="shadow-lg border-0 overflow-hidden p-0 h-100" pt={{ body: { className: 'p-0 h-100' }, content: { style: { padding: '10px', height: '100%' } } }}>
                            <div className="row g-0 h-100">
                                {/* Cover Image and Buttons */}
                                <div className="col-12 col-md-auto p-4 pb-1 pb-md-4 ps-md-0 pe-md-4 position-relative order-1 order-md-2">
                                    <div className="row g-0 flex-md-column align-items-center justify-content-center m-0">
                                        <div className="col-5 col-md-12 p-0 pe-3 pe-md-0 pb-md-3 d-flex justify-content-center">
                                            <div className="w-100 shadow-lg rounded overflow-hidden mx-auto me-md-0" style={{ aspectRatio: '2/3', maxWidth: '200px' }}>
                                                {book.coverUrl ? (
                                                    <img src={`${book.coverUrl}`} alt="Portada" className="w-100 h-100" style={{ objectFit: 'cover' }} />
                                                ) : (
                                                    <div className="w-100 h-100 bg-primary d-flex align-items-center justify-content-center opacity-75">
                                                        <i className="pi pi-book text-white opacity-50" style={{ fontSize: '3rem' }}></i>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="col-7 col-md-12 p-0">
                                            <div className="d-flex flex-column gap-2 w-100 mx-auto" style={{ maxWidth: '200px' }}>
                                    <Button 
                                        label="Leer Ahora" 
                                        icon="pi pi-play" 
                                        className="p-button px-4 shadow-sm fw-bold w-100 justify-content-center" 
                                        onClick={() => navigate(`/read/${book.id}`)}
                                    />
                                    
                                    <div className="d-flex gap-2 justify-content-between w-100">
                                        <Button 
                                            className={`p-button p-button-outlined flex-grow-1 px-0 d-flex justify-content-center align-items-center gap-2 ${book.isFavorited ? 'p-button-danger border-danger text-danger bg-danger bg-opacity-10' : 'p-button-secondary'}`}
                                            onClick={handleToggleFavorite}
                                            tooltip={book.isFavorited ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                                        >
                                            <i className={`pi ${book.isFavorited ? 'pi-heart-fill' : 'pi-heart'}`}></i>
                                            <span className="fw-bold">{book.favoritesCount}</span>
                                        </Button>

                                        <Button 
                                            className="p-button p-button-outlined p-button-secondary flex-grow-1 px-0 d-flex justify-content-center align-items-center"
                                            onClick={() => {
                                                if (!isAuthenticated) {
                                                    alert({ title: 'Acceso Requerido', message: 'INGRESE CON UNA CUENTA', type: 'info' });
                                                    return;
                                                }
                                                setShowListModal(true);
                                            }}
                                            tooltip="Añadir a lista"
                                        >
                                            <i className="pi pi-bookmark"></i>
                                        </Button>

                                        <Button 
                                            className="p-button p-button-outlined p-button-secondary flex-grow-1 px-0 d-flex justify-content-center align-items-center gap-2"
                                            onClick={() => book.isOwner && book.duplicateCount > 0 && setShowDuplicatorsModal(true)}
                                            tooltip={book.isOwner && book.duplicateCount > 0 ? "Ver duplicadores" : "Veces duplicado"}
                                            style={{ cursor: book.isOwner && book.duplicateCount > 0 ? 'pointer' : 'default' }}
                                        >
                                            <i className="pi pi-copy"></i>
                                            <span className="fw-bold">{book.duplicateCount || 0}</span>
                                        </Button>
                                    </div>

                                    {book.isOwner ? (
                                        <Button 
                                            className="p-button-outlined p-button-secondary p-button-sm shadow-sm d-flex justify-content-center align-items-center gap-2 w-100"
                                            onClick={openVisibilityModal}
                                            tooltip="Editar visibilidad"
                                            style={{ height: '2.5rem' }}
                                        >
                                            <i className={visibilityOptions.find(o => o.value === book.visibility)?.icon || 'pi pi-eye'}></i>
                                            <span className="fw-bold">{visibilityOptions.find(o => o.value === book.visibility)?.label || book.visibility}</span>
                                        </Button>
                                    ) : (
                                        <Badge value={visibilityOptions.find(o => o.value === book.visibility)?.label || book.visibility} severity="secondary" className="fw-bold px-3 shadow-sm w-100" style={{ fontSize: '0.85rem', height: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
                                    )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                        <style>
                            {`
                                .book-info-container { padding: 20px; padding-top: 10px; }
                                .mobile-title { font-size: 22px !important; }
                                .mobile-author { font-size: 18px !important; }
                                .mobile-tag { font-size: 12px !important; }
                                .mobile-desc { font-size: 16px !important; }
                                .mobile-comments-title { font-size: 20px !important; }
                                .mobile-comment-avatar { width: 24px !important; height: 24px !important; font-size: 12px !important; }
                                .mobile-existing-comment-avatar { width: 24px !important; height: 24px !important; font-size: 12px !important; }
                                .mobile-commenter-name { font-size: 14px !important; }

                                @media (min-width: 768px) { 
                                    .book-info-container { padding: 30px; padding-right: 12px; padding-top: 30px; } 
                                    .mobile-title { font-size: 32px !important; }
                                    .mobile-author { font-size: 1.25rem !important; }
                                    .mobile-tag { font-size: 0.75rem !important; }
                                    .mobile-desc { font-size: 1.25rem !important; }
                                    .mobile-comments-title { font-size: 24px !important; }
                                    .mobile-comment-avatar { width: 3rem !important; height: 3rem !important; font-size: 1.5rem !important; }
                                    .mobile-existing-comment-avatar { width: 2.5rem !important; height: 2.5rem !important; font-size: 1.25rem !important; }
                                    .mobile-commenter-name { font-size: 1rem !important; }
                                }
                            `}
                        </style>
                        <div className="col-12 col-md book-info-container d-flex flex-column justify-content-between order-2 order-md-1">
                            <div>
                                <h1 className="display-5 fw-bolder text-dark mb-2 mobile-title" style={{ wordBreak: 'break-word' }}>{book.title}</h1>
                                <h5 className="text-secondary mb-4 d-flex align-items-center gap-2 mobile-author">
                                    <i className="pi pi-user"></i> {book.author}
                                </h5>

                                <div className="d-flex flex-wrap gap-2 mb-4">
                                    {book.format && (
                                        <Badge value={book.format.toUpperCase()} severity={book.format.toLowerCase() === 'pdf' ? 'danger' : 'success'} className="fw-bold text-uppercase d-inline-flex align-items-center justify-content-center px-3 shadow-sm mobile-tag" style={{ height: '2rem' }} />
                                    )}
                                    {book.tags && book.tags.map(tag => (
                                        <Badge key={tag.id} value={tag.name} severity="info" className="fw-bold text-uppercase d-inline-flex align-items-center justify-content-center px-3 mobile-tag" style={{ height: '2rem' }} />
                                    ))}
                                </div>

                                <div className="mb-3 mb-md-5">
                                    {isEditingDescription ? (
                                        <div className="d-flex flex-column gap-2">
                                            <InputTextarea 
                                                value={editedDescription}
                                                onChange={(e) => setEditedDescription(e.target.value)}
                                                autoResize
                                                rows={4}
                                                className="w-100 fs-5"
                                            />
                                            <div className="d-flex justify-content-end gap-2 mt-1">
                                                <Button label="Cancelar" className="p-button-text p-button-secondary p-button-sm" onClick={() => { setIsEditingDescription(false); setEditedDescription(book.description || ''); }} disabled={isSavingDescription} />
                                                <Button label="Guardar" className="p-button-sm" onClick={handleSaveDescription} disabled={isSavingDescription} loading={isSavingDescription} />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="d-flex align-items-start justify-content-between gap-3">
                                            <div className="flex-grow-1">
                                                {book.description ? (
                                                    <p className="text-dark fs-5 mb-0 mobile-desc" style={{ lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{book.description}</p>
                                                ) : (
                                                    <p className="text-secondary fst-italic mb-0 mobile-desc">Sin descripción disponible.</p>
                                                )}
                                            </div>
                                            {book.isOwner && (
                                                <Button 
                                                    icon="pi pi-pencil" 
                                                    className="p-button-rounded p-button-text p-button-secondary flex-shrink-0" 
                                                    onClick={() => setIsEditingDescription(true)}
                                                    tooltip="Editar descripción"
                                                    style={{ width: '2.5rem', height: '2.5rem' }}
                                                />
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="d-flex flex-row gap-3 mb-2 mb-md-4 flex-wrap">
                                    <Link to={`/profile/${book.creatorId}`} className="text-decoration-none text-dark">
                                        <div className="d-flex align-items-center gap-3 py-2 ps-2 rounded bg-light border" style={{ paddingRight: '20px' }}>
                                            {book.creator?.avatarUrl ? (
                                                <Avatar image={`${book.creator.avatarUrl.startsWith('http') || book.creator.avatarUrl.startsWith('/') ? book.creator.avatarUrl : '/' + book.creator.avatarUrl}`} shape="circle" size="normal" className="shadow-sm" />
                                            ) : (
                                                <Avatar label={book.creator?.username.charAt(0).toUpperCase()} shape="circle" size="normal" className="bg-primary text-white shadow-sm" />
                                            )}
                                            <div>
                                                <p className="small text-secondary m-0" style={{ fontSize: '0.8rem' }}>Subido por</p>
                                                <p className="fw-bold text-dark m-0" style={{ fontSize: '0.9rem' }}>{book.creator?.username}</p>
                                                {book.createdAt && (
                                                    <p className="small text-secondary m-0 mt-1" style={{ fontSize: '0.75rem' }}>{new Date(book.createdAt).toLocaleDateString()}</p>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                    
                                    {book.originalUploader && (
                                        <div className="d-flex align-items-center gap-3 py-2 ps-2 rounded bg-light border" style={{ paddingRight: '20px' }}>
                                            <Avatar label={book.originalUploader.username.charAt(0).toUpperCase()} shape="circle" size="normal" className="bg-secondary text-white shadow-sm" />
                                            <div>
                                                <p className="small text-secondary m-0" style={{ fontSize: '0.8rem' }}>Publicador original</p>
                                                <p className="fw-bold text-dark m-0" style={{ fontSize: '0.9rem' }}>{book.originalUploader.username}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            </div>
                        </div>
                </Card>
                </div>

                {/* Comments Section */}
                <div className="col-12 col-lg-4">
                <Card className="shadow-sm border-0 h-100" pt={{ content: { style: { padding: '10px' } } }}>
                    <h3 className="fw-bold text-dark mb-4 d-flex align-items-center gap-3 border-bottom pb-3 mobile-comments-title">
                        <i className="pi pi-comments text-primary fs-3"></i>
                        Comentarios del Libro ({comments.length})
                    </h3>

                    {isAuthenticated ? (
                        <form onSubmit={handleAddComment} className="d-flex gap-3 mb-5">
                            {user?.avatarUrl ? (
                                <Avatar image={`${user.avatarUrl}`} shape="circle" size="xlarge" className="shadow-sm shrink-0 mobile-comment-avatar" />
                            ) : (
                                <Avatar label={user?.username?.charAt(0).toUpperCase()} shape="circle" size="xlarge" className="bg-primary text-white shadow-sm shrink-0 mobile-comment-avatar" />
                            )}
                            <div className="flex-grow-1 d-flex flex-column align-items-end gap-2">
                                <InputTextarea 
                                    value={newComment}
                                    onChange={e => setNewComment(e.target.value)}
                                    placeholder="Escribe tu opinión sobre el libro..."
                                    className="w-100"
                                    rows={3}
                                    autoResize
                                    required
                                />
                                <Button 
                                    type="submit" 
                                    label="Comentar" 
                                    icon="pi pi-send" 
                                    disabled={!newComment.trim()} 
                                    className="p-button-sm shadow-sm"
                                />
                            </div>
                        </form>
                    ) : (
                        <div className="text-center p-4 bg-light rounded border mb-5">
                            <p className="fw-bold text-secondary mb-3">Inicia sesión para dejar un comentario sobre este libro.</p>
                            <Button label="Iniciar Sesión" onClick={() => navigate('/login')} className="p-button-sm" />
                        </div>
                    )}

                    <div className="d-flex flex-column gap-4">
                        {comments.length === 0 ? (
                            <div className="text-center py-5">
                                <i className="pi pi-comment text-secondary mb-3 opacity-50" style={{ fontSize: '3rem' }}></i>
                                <p className="fw-bold text-secondary">No hay comentarios aún. ¡Sé el primero en opinar!</p>
                            </div>
                        ) : (
                            (() => {
                                const parentComments = comments.filter(c => !c.parentId);
                                const getReplies = (parentId: string) => comments.filter(c => c.parentId === parentId).sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

                                const renderComment = (comment: any, isReply = false) => {
                                    const canDelete = isAuthenticated && (user?.id === comment.user?.id || user?.id === book.creatorId || user?.id === book.originalUploader?.id);

                                    return (
                                        <div key={comment.id} className={`p-3 p-md-3 rounded border ${isReply ? 'bg-light ms-2 ms-md-5 mt-3' : 'bg-white mt-2 mt-md-0'}`} style={{ borderColor: 'var(--surface-border)' }}>
                                            <div className="d-flex gap-2 gap-md-3">
                                                <Link to={`/profile/${comment.user?.id}`} className="flex-shrink-0">
                                                    {comment.user?.avatarUrl ? (
                                                        <Avatar image={`${comment.user.avatarUrl}`} shape="circle" className="mobile-existing-comment-avatar" />
                                                    ) : (
                                                        <Avatar label={comment.user?.username?.charAt(0).toUpperCase()} shape="circle" className="bg-secondary text-white mobile-existing-comment-avatar" />
                                                    )}
                                                </Link>
                                                <div className="flex-grow-1 overflow-hidden" style={{ minWidth: 0 }}>
                                                    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-2 gap-1">
                                                        <Link to={`/profile/${comment.user?.id}`} className="text-decoration-none text-truncate" style={{ maxWidth: '100%' }}>
                                                            <span className="fw-bold text-dark mobile-commenter-name">{comment.user?.username}</span>
                                                        </Link>
                                                        <span className="small text-secondary fw-bold" style={{ fontSize: '0.75rem' }}>{new Date(comment.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                    
                                                    <p className="text-dark mb-3" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.9rem' }}>{comment.content}</p>
                                                    
                                                    <div className="d-flex align-items-center flex-nowrap mt-2" style={{ gap: '0.5rem', overflowX: 'auto', paddingBottom: '2px' }}>
                                                        <Button 
                                                            icon={`pi ${comment.userReaction === 'like' ? 'pi-thumbs-up-fill' : 'pi-thumbs-up'}`}
                                                            label={(comment.likesCount || 0).toString()}
                                                            className={`p-button-text p-button-sm p-0 px-2 ${comment.userReaction === 'like' ? 'text-primary' : 'text-secondary'}`}
                                                            onClick={() => handleReaction(comment.id, 'like')}
                                                            style={{ fontSize: '0.8rem', minWidth: '0' }}
                                                        />
                                                        <Button 
                                                            icon={`pi ${comment.userReaction === 'dislike' ? 'pi-thumbs-down-fill' : 'pi-thumbs-down'}`}
                                                            label={(comment.dislikesCount || 0).toString()}
                                                            className={`p-button-text p-button-sm p-0 px-2 ${comment.userReaction === 'dislike' ? 'text-danger' : 'text-secondary'}`}
                                                            onClick={() => handleReaction(comment.id, 'dislike')}
                                                            style={{ fontSize: '0.8rem', minWidth: '0' }}
                                                        />
                                                        
                                                        {!isReply && (
                                                            <Button 
                                                                icon="pi pi-reply"
                                                                label="Responder"
                                                                className="p-button-text p-button-sm p-button-secondary p-0 px-2"
                                                                onClick={() => {
                                                                    if (!isAuthenticated) {
                                                                        alert({ title: 'Acceso Requerido', message: 'INGRESE CON UNA CUENTA', type: 'info' });
                                                                        return;
                                                                    }
                                                                    setReplyingTo(replyingTo === comment.id ? null : comment.id);
                                                                }}
                                                                style={{ fontSize: '0.8rem', minWidth: '0' }}
                                                            />
                                                        )}

                                                        {canDelete && (
                                                            <Button 
                                                                icon="pi pi-trash"
                                                                className="p-button-text p-button-sm p-button-danger p-0 px-2 ms-auto"
                                                                onClick={() => handleDeleteComment(comment.id)}
                                                                style={{ fontSize: '0.8rem', minWidth: '0' }}
                                                            />
                                                        )}
                                                    </div>

                                                    {replyingTo === comment.id && !isReply && (
                                                        <form onSubmit={(e) => handleAddReply(comment.id, e)} className="mt-3 d-flex gap-2 align-items-start bg-white p-3 rounded border">
                                                            <InputTextarea 
                                                                value={replyContent}
                                                                onChange={e => setReplyContent(e.target.value)}
                                                                placeholder="Escribe tu respuesta..."
                                                                className="flex-grow-1"
                                                                rows={2}
                                                                autoResize
                                                                required
                                                            />
                                                            <Button type="submit" icon="pi pi-send" disabled={!replyContent.trim()} className="p-button-sm" />
                                                        </form>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                };

                                const displayedComments = isMobile ? parentComments.slice(0, 5) : parentComments;

                                return (
                                    <>
                                        {displayedComments.map(c => (
                                            <div key={c.id}>
                                                {renderComment(c, false)}
                                                {getReplies(c.id).map(reply => renderComment(reply, true))}
                                            </div>
                                        ))}
                                        {isMobile && parentComments.length > 5 && (
                                            <div className="text-center mt-4">
                                                <Button 
                                                    label={`Ver ${parentComments.length - 5} comentarios más`} 
                                                    icon="pi pi-comments" 
                                                    className="p-button-outlined p-button-sm p-button-secondary w-100 fw-bold" 
                                                    style={{ borderRadius: '2rem' }}
                                                    onClick={() => setShowAllCommentsModal(true)} 
                                                />
                                            </div>
                                        )}

                                        <Dialog 
                                            visible={showAllCommentsModal} 
                                            onHide={() => setShowAllCommentsModal(false)}
                                            header={`Comentarios (${comments.length})`}
                                            style={isMobile ? { width: '100vw', margin: '0', maxHeight: '100vh', height: '100vh', borderRadius: '0' } : { width: '50vw' }}
                                            contentClassName="p-3 p-md-4"
                                            dismissableMask
                                        >
                                            {parentComments.map(c => (
                                                <div key={c.id}>
                                                    {renderComment(c, false)}
                                                    {getReplies(c.id).map(reply => renderComment(reply, true))}
                                                </div>
                                            ))}
                                        </Dialog>
                                    </>
                                );
                            })()
                        )}
                    </div>
                </Card>
                </div>
            </div>
        </div>

            {showListModal && (
                <ListManagerModal isOpen={true} bookId={book.id} onClose={() => setShowListModal(false)} />
            )}

            {showDuplicatorsModal && (
                <Dialog 
                    header="Usuarios que duplicaron este libro" 
                    visible={showDuplicatorsModal} 
                    onHide={() => setShowDuplicatorsModal(false)}
                    style={{ width: '90vw', maxWidth: '400px' }}
                    dismissableMask
                >
                    <div className="d-flex flex-column gap-3">
                        {book.duplicators && book.duplicators.length > 0 ? (
                            book.duplicators.map(dup => (
                                <Link to={`/profile/${dup.id}`} key={dup.id} className="text-decoration-none text-dark d-flex align-items-center gap-3 p-2 rounded hover-bg-light transition-colors cursor-pointer">
                                    {dup.avatarUrl ? (
                                        <Avatar image={dup.avatarUrl} shape="circle" size="large" />
                                    ) : (
                                        <Avatar label={dup.username.charAt(0).toUpperCase()} shape="circle" size="large" className="bg-primary text-white" />
                                    )}
                                    <span className="fw-bold text-dark fs-5">{dup.username}</span>
                                </Link>
                            ))
                        ) : (
                            <p className="text-secondary text-center my-4">Nadie ha duplicado este libro aún.</p>
                        )}
                    </div>
                </Dialog>
            )}

            {/* Edit Visibility Modal */}
            <Dialog 
                header="Editar Visibilidad" 
                visible={showVisibilityModal} 
                onHide={() => setShowVisibilityModal(false)}
                style={{ width: '90vw', maxWidth: '500px' }}
                dismissableMask
            >
                <div className="d-flex flex-column gap-4 py-3">
                    <div className="d-flex flex-column gap-2">
                        <label className="fw-bold text-dark">Nivel de visibilidad</label>
                        <Dropdown 
                            value={editVisibility} 
                            options={visibilityOptions} 
                            onChange={(e) => setEditVisibility(e.value)} 
                            itemTemplate={visibilityTemplate}
                            valueTemplate={visibilityTemplate}
                            className="w-100"
                            pt={{
                                item: { className: 'p-2', style: { paddingLeft: '10px' } },
                                input: { className: 'p-2', style: { paddingLeft: '10px' } },
                                list: { className: 'p-0' }
                            }}
                        />
                    </div>

                    {(editVisibility === 'restricted' || editVisibility === 'public') && (
                        <div className="d-flex flex-column gap-2 border p-3 rounded bg-light">
                            <label className="fw-bold text-dark mb-1">
                                <i className="pi pi-users me-2"></i>
                                {editVisibility === 'public' ? 'Permisos de Edición' : 'Círculo Permitido'}
                            </label>
                            <p className="small text-secondary mb-2">
                                {editVisibility === 'public' 
                                    ? 'Selecciona a tus amigos que también podrán editar este libro.' 
                                    : 'Selecciona a tus amigos que podrán ver y acceder a este libro.'}
                            </p>
                            <MultiSelect 
                                value={editAllowedUsers} 
                                options={friends} 
                                onChange={(e) => setEditAllowedUsers(e.value)} 
                                optionLabel="label" 
                                optionValue="value"
                                placeholder="Seleccionar amigos" 
                                className="w-100"
                                display="chip"
                                emptyMessage="No tienes amigos añadidos"
                                selectAllLabel="Seleccionar todos mis amigos."
                            />
                        </div>
                    )}

                    <div className="d-flex justify-content-end gap-2 mt-4 border-top pt-3">
                        <Button label="Cancelar" className="p-button-text p-button-secondary" onClick={() => setShowVisibilityModal(false)} />
                        <Button label="Guardar" className="p-button-primary" onClick={handleUpdateVisibility} />
                    </div>
                </div>
            </Dialog>
        </div>
    );
}
