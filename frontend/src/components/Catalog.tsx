// @ts-nocheck
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDialog } from './ui/DialogProvider';
import { ListManagerModal } from './ListManagerModal';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Checkbox } from 'primereact/checkbox';
import { Badge } from 'primereact/badge';
import { Avatar } from 'primereact/avatar';
import { Paginator } from 'primereact/paginator';

export const Catalog = () => {
    const [books, setBooks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { token, user } = useAuth();
    const { alert, confirm } = useDialog();

    const [editingId, setEditingId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'owner' | 'shared' | 'favorites' | 'lists'>('owner');
    const [customLists, setCustomLists] = useState<any[]>([]);
    const [selectedListId, setSelectedListId] = useState<string | null>(null);
    const [listModalOpen, setListModalOpen] = useState(false);
    const [selectedBookForList, setSelectedBookForList] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editAuthor, setEditAuthor] = useState('');
    const [editVisibility, setEditVisibility] = useState<'public' | 'private' | 'restricted'>('public');
    const [editShowCreatorAnnotations, setEditShowCreatorAnnotations] = useState(false);
    const [editCoverFile, setEditCoverFile] = useState<File | null>(null);
    const [editCoverUrl, setEditCoverUrl] = useState('');
    const [editRemoveCover, setEditRemoveCover] = useState(false);
    const [friends, setFriends] = useState<any[]>([]);
    const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
    const [availableTags, setAvailableTags] = useState<any[]>([]);
    const [editTags, setEditTags] = useState<string[]>([]);

    const [firstOwner, setFirstOwner] = useState(0);
    const [firstShared, setFirstShared] = useState(0);
    const [firstFav, setFirstFav] = useState(0);
    const [firstList, setFirstList] = useState(0);
    const [firstCustomLists, setFirstCustomLists] = useState(0);
    const rows = 8;

    const fetchBooks = async () => {
        try {
            const headers: any = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch('/api/books', {
                headers,
                cache: 'no-store'
            });
            if (res.ok) {
                const data = await res.json();
                setBooks(data);
            }
        } catch (error) {
            console.error('Error fetching catalog:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBooks();
        if (token) {
            fetchLists();
        }
    }, [token]);

    const fetchLists = async () => {
        try {
            const res = await fetch('/api/lists', {
                headers: { 'Authorization': `Bearer ${token}` },
                cache: 'no-store'
            });
            if (res.ok) {
                const data = await res.json();
                setCustomLists(data);
            }
        } catch (error) {
            console.error('Error fetching lists:', error);
        }
    };

    const openListModal = (bookId: string | null, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setSelectedBookForList(bookId);
        setListModalOpen(true);
    };

    useEffect(() => {
        if ((editVisibility === 'restricted' || editVisibility === 'public') && friends.length === 0 && token) {
            fetch('/api/friends/list', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(data => setFriends(data))
                .catch(err => console.error(err));
        }
    }, [editVisibility, token, friends.length]);

    useEffect(() => {
        if (token) {
            fetch('/api/tags', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(data => setAvailableTags(data))
                .catch(err => console.error(err));

            fetch('/api/lists', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(data => setCustomLists(data))
                .catch(err => console.error(err));
        }
    }, [token]);

    const toggleFavorite = async (book: any, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!token) return;
        try {
            const method = book.isFavorited ? 'DELETE' : 'POST';
            const res = await fetch(`/api/books/${book.id}/favorite`, {
                method,
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setBooks(books.map(b => b.id === book.id ? { ...b, isFavorited: !b.isFavorited, favoritesCount: b.isFavorited ? b.favoritesCount - 1 : b.favoritesCount + 1 } : b));
            }
        } catch (err) {
            console.error('Error toggling favorite:', err);
        }
    };

    const handleFriendToggle = (friendId: string, e: React.MouseEvent | React.ChangeEvent) => {
        e.stopPropagation();
        setSelectedFriends(prev =>
            prev.includes(friendId) ? prev.filter(id => id !== friendId) : [...prev, friendId]
        );
    };

    const handleTagToggle = (tagId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditTags(prev =>
            prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
        );
    };

    const handleDeleteList = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const isConfirmed = await confirm({ title: 'Eliminar lista', message: '¿Estás seguro de que deseas eliminar esta lista? Los libros guardados en ella no se borrarán de tu biblioteca.', type: 'warning' });
        if (!isConfirmed) return;

        try {
            const res = await fetch(`/api/lists/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setCustomLists(customLists.filter(l => l.id !== id));
            } else {
                await alert({ title: 'Error', message: 'No se pudo eliminar la lista.', type: 'error' });
            }
        } catch (err) {
            console.error('Error al eliminar lista', err);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const isConfirmed = await confirm({ title: 'Eliminar libro', message: '¿Estás seguro de que deseas eliminar este libro? Esto borrará todas las secciones asociadas.', type: 'warning' });
        if (!isConfirmed) return;

        try {
            const res = await fetch(`/api/books/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setBooks(books.filter(b => b.id !== id));
            } else {
                await alert({ title: 'Error', message: 'No se pudo eliminar el libro.', type: 'error' });
            }
        } catch (err) {
            console.error('Error al eliminar', err);
        }
    };

    const handleEditStart = (book: any, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingId(book.id);
        setEditTitle(book.title);
        setEditAuthor(book.author);
        setEditVisibility(book.visibility || 'public');
        setEditShowCreatorAnnotations(book.showCreatorAnnotations || false);
        setSelectedFriends(book.allowedUsers || []);
        setEditTags(book.tags ? book.tags.map((t: any) => t.id) : []);
        setEditCoverFile(null);
        setEditCoverUrl('');
        setEditRemoveCover(false);
    };

    const handleEditSave = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (editVisibility === 'restricted' && selectedFriends.length === 0) {
            return await alert({ title: 'Atención', message: 'Debes seleccionar al menos un amigo para el acceso restringido.', type: 'warning' });
        }
        try {
            const bodyPayload: any = { title: editTitle, author: editAuthor, visibility: editVisibility, showCreatorAnnotations: editShowCreatorAnnotations };
            if (editCoverUrl) bodyPayload.coverUrl = editCoverUrl;
            if (editRemoveCover) bodyPayload.coverUrl = '';

            if (editVisibility === 'restricted' || editVisibility === 'public') {
                bodyPayload.allowedUsers = selectedFriends;
            }
            bodyPayload.tags = editTags;
            const res = await fetch(`/api/books/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(bodyPayload)
            });
            if (res.ok) {
                let updatedCoverUrl = books.find(b => b.id === id)?.coverUrl;

                if (editRemoveCover) updatedCoverUrl = '';
                else if (editCoverUrl) updatedCoverUrl = editCoverUrl;

                if (editCoverFile) {
                    const coverFormData = new FormData();
                    coverFormData.append('cover', editCoverFile);
                    const coverRes = await fetch(`/api/books/${id}/cover`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` },
                        body: coverFormData
                    });
                    if (coverRes.ok) {
                        const coverData = await coverRes.json();
                        updatedCoverUrl = coverData.coverUrl;
                    }
                }

                setBooks(books.map(b => b.id === id ? {
                    ...b,
                    title: editTitle,
                    author: editAuthor,
                    visibility: editVisibility,
                    coverUrl: updatedCoverUrl,
                    allowedUsers: selectedFriends,
                    allowedUsersDetails: friends.filter(f => selectedFriends.includes(f.id)),
                    showCreatorAnnotations: editShowCreatorAnnotations,
                    tags: availableTags.filter(t => editTags.includes(t.id))
                } : b));
                setEditingId(null);
            } else {
                await alert({ title: 'Error', message: 'No se pudo actualizar el libro.', type: 'error' });
            }
        } catch (err) {
            console.error('Error al editar', err);
        }
    };

    const handleEditCancel = (e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingId(null);
    };

    const renderBookCard = (book: any) => (
        <div className="col-12 col-sm-6 col-md-4 col-lg-3 mb-4" key={book.id}>
            <Card
                className={`h-100 shadow-sm border-0 position-relative overflow-hidden cursor-pointer ${editingId === book.id ? 'shadow-lg border border-primary' : 'card-hover-effect'}`}
                onClick={() => {
                    if (editingId !== book.id) {
                        navigate(`/book/${book.id}`);
                    }
                }}
                style={{ cursor: editingId === book.id ? 'default' : 'pointer' }}
                pt={{ body: { className: 'p-0 d-flex flex-column h-100' }, content: { className: 'p-0 m-0 flex-grow-1 d-flex flex-column' } }}
            >
                {/* HEADER IMAGE */}
                <div className="position-relative bg-light overflow-hidden" style={{ height: '160px' }}>
                    {book.coverUrl ? (
                        <img src={book.coverUrl.startsWith('http') ? book.coverUrl : `${book.coverUrl}`} alt="Cover" className="w-100 h-100" style={{ objectFit: 'cover' }} />
                    ) : (
                        <div className="w-100 h-100 d-flex justify-content-center align-items-center bg-primary bg-opacity-10">
                            <i className="pi pi-book text-primary opacity-50" style={{ fontSize: '4rem' }}></i>
                        </div>
                    )}

                    <div className="position-absolute top-0 end-0 m-2 d-flex gap-2">
                        <Button
                            icon="pi pi-bookmark"
                            rounded
                            text
                            severity="secondary"
                            className="bg-white bg-opacity-75 shadow-sm"
                            onClick={(e) => openListModal(book.id, e)}
                            style={{ width: '2rem', height: '2rem' }}
                            tooltip="Añadir a lista"
                        />
                        <Button
                            icon={book.isFavorited ? 'pi pi-heart-fill text-danger' : 'pi pi-heart'}
                            rounded
                            text
                            severity="secondary"
                            className="bg-white bg-opacity-75 shadow-sm"
                            onClick={(e) => toggleFavorite(book, e)}
                            style={{ width: '2rem', height: '2rem' }}
                            tooltip={book.isFavorited ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                        />
                    </div>
                </div>

                {editingId === book.id ? (
                    <div className="p-3 d-flex flex-column flex-grow-1 bg-white z-2">
                        <InputText
                            autoFocus
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            disabled={book.isDuplicate}
                            className="fw-bold mb-2 p-inputtext-sm"
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Título"
                            tooltip={book.isDuplicate ? "No puedes cambiar el título de un libro duplicado" : "Título"}
                        />
                        <InputText
                            value={editAuthor}
                            onChange={(e) => setEditAuthor(e.target.value)}
                            className="mb-2 p-inputtext-sm text-secondary"
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Autor"
                        />

                        {book.isOwner && (
                            <>
                                <select
                                    value={editVisibility}
                                    onChange={(e) => setEditVisibility(e.target.value as any)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="form-select form-select-sm mb-2"
                                >
                                    {!book.isDuplicate && <option value="public">Público</option>}
                                    <option value="private">Privado</option>
                                    <option value="restricted">Restringido</option>
                                </select>

                                {editVisibility === 'public' && (
                                    <div className="d-flex align-items-center mb-2">
                                        <Checkbox inputId="showAnnot" checked={editShowCreatorAnnotations} onChange={e => setEditShowCreatorAnnotations(e.checked || false)} onClick={e => e.stopPropagation()} />
                                        <label htmlFor="showAnnot" className="ms-2 small cursor-pointer" onClick={e => e.stopPropagation()}>Mostrar mis anotaciones a los demás</label>
                                    </div>
                                )}

                                {(editVisibility === 'restricted' || editVisibility === 'public') && (
                                    <div className="mb-2 border rounded p-2 bg-light" onClick={e => e.stopPropagation()} style={{ maxHeight: '120px', overflowY: 'auto' }}>
                                        <span className="small fw-bold text-secondary d-block mb-1">
                                            {editVisibility === 'restricted' ? 'Selecciona qué amigos podrán leerlo:' : 'Amigos con permiso de anotar (Opcional):'}
                                        </span>
                                        {friends.length === 0 ? (
                                            <span className="small text-secondary">No tienes amigos para compartir.</span>
                                        ) : (
                                            friends.map(friend => (
                                                <div key={friend.id} className="d-flex align-items-center mb-1">
                                                    <Checkbox inputId={`friend-${friend.id}`} checked={selectedFriends.includes(friend.id)} onChange={e => handleFriendToggle(friend.id, e)} onClick={e => e.stopPropagation()} />
                                                    <label htmlFor={`friend-${friend.id}`} className="ms-2 small cursor-pointer" onClick={e => e.stopPropagation()}>{friend.username}</label>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}

                                <div className="mb-2" onClick={e => e.stopPropagation()}>
                                    <label className="small fw-bold text-secondary d-block mb-1">Etiquetas</label>
                                    <div className="d-flex flex-wrap gap-1 border rounded p-2 bg-light" style={{ maxHeight: '80px', overflowY: 'auto' }}>
                                        {availableTags.length === 0 ? (
                                            <span className="small text-secondary">Sin etiquetas</span>
                                        ) : (
                                            availableTags.map(tag => (
                                                <Button
                                                    key={tag.id}
                                                    label={tag.name}
                                                    severity={editTags.includes(tag.id) ? 'primary' : 'secondary'}
                                                    outlined={!editTags.includes(tag.id)}
                                                    className="p-button-sm py-1 px-2"
                                                    style={{ fontSize: '0.7rem' }}
                                                    onClick={(e) => handleTagToggle(tag.id, e)}
                                                />
                                            ))
                                        )}
                                    </div>
                                </div>

                                <div className="mb-2">
                                    <label className="small fw-bold text-secondary d-block mb-1">Portada (Archivo o Enlace)</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={e => {
                                            setEditCoverFile(e.target.files ? e.target.files[0] : null);
                                            if (e.target.files && e.target.files.length > 0) {
                                                setEditCoverUrl('');
                                                setEditRemoveCover(false);
                                            }
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="form-control form-control-sm mb-1"
                                    />
                                    <InputText
                                        type="url"
                                        placeholder="https://...imagen.jpg"
                                        value={editCoverUrl}
                                        onChange={(e) => {
                                            setEditCoverUrl(e.target.value);
                                            if (e.target.value) {
                                                setEditCoverFile(null);
                                                setEditRemoveCover(false);
                                            }
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-100 p-inputtext-sm mb-1"
                                    />
                                    <div className="d-flex align-items-center mt-1">
                                        <Checkbox inputId="removeCover" checked={editRemoveCover} onChange={e => {
                                            setEditRemoveCover(e.checked || false);
                                            if (e.checked) {
                                                setEditCoverFile(null);
                                                setEditCoverUrl('');
                                            }
                                        }} onClick={e => e.stopPropagation()} />
                                        <label htmlFor="removeCover" className="ms-2 small text-danger fw-bold cursor-pointer" onClick={e => e.stopPropagation()}>Borrar imagen actual</label>
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="d-flex gap-2 mt-auto pt-3 border-top">
                            <Button label="Guardar" severity="success" className="flex-fill p-button-sm" onClick={(e) => handleEditSave(book.id, e)} />
                            <Button label="Cancelar" severity="secondary" className="flex-fill p-button-sm" onClick={handleEditCancel} />
                        </div>
                    </div>
                ) : (
                    <div className="px-3 pt-3 pb-2 d-flex flex-column flex-grow-1 bg-white">
                        <h5 className="fw-bold text-dark mb-1 text-truncate" title={book.title}>{book.title}</h5>
                        <p className="text-secondary small mb-2 fw-bold">{book.author}</p>

                        {book.isDuplicate && book.originalUploader ? (
                            <div className="d-flex align-items-center gap-2 mb-2">
                                <Badge value="Duplicado" severity="info" />
                                {book.format === 'pdf' && <Badge value="PDF" severity="danger" />}
                                <span className="small text-secondary text-truncate">De: {book.originalUploader.username}</span>
                            </div>
                        ) : book.creator && (
                            <div className="d-flex align-items-center gap-2 mb-2">
                                {book.format === 'pdf' && <Badge value="PDF" severity="danger" />}
                                {book.creator.avatarUrl ? (
                                    <Avatar image={book.creator.avatarUrl} shape="circle" size="small" className="bg-white" />
                                ) : (
                                    <Avatar label={book.creator.username.charAt(0).toUpperCase()} shape="circle" size="small" className="bg-primary text-white" />
                                )}
                                <span className="small text-secondary text-truncate">{book.creator.username}</span>
                            </div>
                        )}

                        {book.tags && book.tags.length > 0 && (
                            <div className="d-flex flex-wrap gap-1 mb-3">
                                {book.tags.map((tag: any) => (
                                    <Badge key={tag.id} value={tag.name} severity="secondary" className="bg-light text-secondary border" />
                                ))}
                            </div>
                        )}

                        <div className="mt-auto pt-3">
                            <div className="d-flex justify-content-between mb-1">
                                <span className="small fw-bold text-secondary">Progreso</span>
                                <span className="small fw-bold text-primary">{book.progress}%</span>
                            </div>
                            <div className="progress mb-3" style={{ height: '6px' }}>
                                <div className="progress-bar bg-success" role="progressbar" style={{ width: `${book.progress}%` }} aria-valuenow={book.progress} aria-valuemin={0} aria-valuemax={100}></div>
                            </div>

                            <div className="d-flex justify-content-between align-items-end">
                                <div className="d-flex gap-2 align-items-center">
                                    <Badge value={book.isOwner ? 'Propietario' : 'Invitado'} severity={book.isOwner ? 'primary' : 'success'} />
                                    {!book.isOwner && user?.role === 'admin' && (
                                        <Badge value="Admin" severity="danger" />
                                    )}
                                </div>

                                <div className="d-flex flex-column align-items-end gap-2">
                                    {book.allowedUsersDetails && book.allowedUsersDetails.length > 0 && (
                                        <div className="d-flex" style={{ marginLeft: '10px' }}>
                                            {book.allowedUsersDetails.slice(0, 3).map((u: any, idx: number) => (
                                                <Avatar
                                                    key={u.id}
                                                    image={u.avatarUrl}
                                                    label={!u.avatarUrl ? u.username.charAt(0).toUpperCase() : ''}
                                                    shape="circle"
                                                    className="border border-white"
                                                    style={{ width: '24px', height: '24px', marginLeft: idx > 0 ? '-10px' : '0', fontSize: '10px' }}
                                                />
                                            ))}
                                            {book.allowedUsersDetails.length > 3 && (
                                                <Avatar
                                                    label={`+${book.allowedUsersDetails.length - 3}`}
                                                    shape="circle"
                                                    className="bg-light text-secondary border border-white"
                                                    style={{ width: '24px', height: '24px', marginLeft: '-10px', fontSize: '10px' }}
                                                />
                                            )}
                                        </div>
                                    )}

                                    <div className="d-flex gap-1 mt-auto pt-2 border-top border-secondary border-opacity-10">
                                        {(book.isOwner || user?.role === 'admin') && (
                                            <>
                                                <Button icon="pi pi-pencil" rounded text severity="secondary" aria-label="Editar" onClick={(e) => handleEditStart(book, e)} />
                                                <Button icon="pi pi-trash" rounded text severity="danger" aria-label="Eliminar" onClick={(e) => handleDelete(book.id, e)} />
                                            </>
                                        )}
                                        <Button label="Leer" link className="p-0 text-primary fw-bold" onClick={(e) => { e.stopPropagation(); navigate(`/read/${book.id}`); }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );

    return (
        <div className="container-fluid pt-4 pt-md-5 pb-5 min-vh-100" style={{ backgroundColor: 'var(--surface-ground)' }}>
            <style>
                {`
                    .mobile-catalog-title { font-size: 25px !important; }
                    .mobile-catalog-desc { font-size: 15px !important; }
                    .mobile-header-margin { margin-bottom: 10px !important; }
                    .mobile-tab-btn { font-size: 14px !important; }
                    .mobile-section-title { font-size: 18px !important; }

                    @media (min-width: 768px) {
                        .mobile-catalog-title { font-size: calc(1.375rem + 1.5vw) !important; }
                        .mobile-catalog-desc { font-size: 1.25rem !important; }
                        .mobile-header-margin { margin-bottom: 3rem !important; }
                        .mobile-tab-btn { font-size: 1rem !important; }
                        .mobile-section-title { font-size: 1.75rem !important; }
                    }
                `}
            </style>
            <div className="container" style={{ maxWidth: '1400px' }}>
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-end gap-4 mobile-header-margin">
                    <div>
                        <h2 className="display-6 fw-bolder mb-2 mobile-catalog-title" style={{ color: 'var(--text-color)' }}>Mi Catálogo</h2>
                        <p className="lead text-secondary mb-0 mobile-catalog-desc">Libros subidos y compartidos con tu red social.</p>
                    </div>
                    {token && (
                        <Button
                            label="Nuevo Libro"
                            icon="pi pi-plus"
                            className="p-button-lg p-button-raised shadow"
                            onClick={() => navigate('/upload')}
                        />
                    )}
                </div>

                {loading ? (
                    <div className="text-center py-5">
                        <i className="pi pi-spin pi-spinner text-primary" style={{ fontSize: '3rem' }}></i>
                        <p className="mt-3 text-secondary fw-bold">Cargando catálogo...</p>
                    </div>
                ) : (
                    <>
                        <div className="d-flex gap-2 mb-4 pb-3 border-bottom overflow-auto justify-content-center px-2">
                            <Button
                                label="Mis archivos"
                                className={`p-button-rounded mobile-tab-btn text-nowrap ${activeTab === 'owner' ? 'p-button-primary' : 'p-button-secondary p-button-text'}`}
                                onClick={() => { setActiveTab('owner'); setSelectedListId(null); }}
                            />
                            <Button
                                label="Compartidos conmigo"
                                className={`p-button-rounded mobile-tab-btn text-nowrap ${activeTab === 'shared' ? 'p-button-primary' : 'p-button-secondary p-button-text'}`}
                                onClick={() => { setActiveTab('shared'); setSelectedListId(null); }}
                            />
                            <Button
                                label="Favoritos"
                                className={`p-button-rounded mobile-tab-btn text-nowrap ${activeTab === 'favorites' ? 'p-button-primary' : 'p-button-secondary p-button-text'}`}
                                onClick={() => { setActiveTab('favorites'); setSelectedListId(null); }}
                            />
                            <Button
                                label="Listas Personalizadas"
                                className={`p-button-rounded mobile-tab-btn text-nowrap ${activeTab === 'lists' ? 'p-button-primary' : 'p-button-secondary p-button-text'}`}
                                onClick={() => { setActiveTab('lists'); setSelectedListId(null); }}
                            />
                        </div>

                        <div className="pb-5">
                            {activeTab === 'owner' && (
                                books.filter(b => b.isOwner).length === 0 ? (
                                    <div className="text-center py-5 rounded shadow-sm border" style={{ backgroundColor: 'var(--surface-card)', borderColor: 'var(--surface-border)' }}>
                                        <i className="pi pi-book text-secondary mb-3" style={{ fontSize: '3rem' }}></i>
                                        <h4 className="fw-bold" style={{ color: 'var(--text-color)' }}>No tienes archivos propios</h4>
                                        <p className="text-secondary">¡Sube uno nuevo para empezar!</p>
                                    </div>
                                ) : (
                                    <div className="d-flex flex-column gap-4">
                                        <h3 className="fw-bold text-dark mb-4 border-start border-primary border-4 ps-3 mobile-section-title">Mis archivos</h3>
                                        <div className="row g-4">
                                            {books.filter(b => b.isOwner).slice(firstOwner, firstOwner + rows).map(renderBookCard)}
                                        </div>
                                        {books.filter(b => b.isOwner).length > rows && (
                                            <Paginator first={firstOwner} rows={rows} totalRecords={books.filter(b => b.isOwner).length} onPageChange={(e) => setFirstOwner(e.first)} className="mt-4 bg-transparent border-0" />
                                        )}
                                    </div>
                                )
                            )}

                            {activeTab === 'shared' && (
                                books.filter(b => !b.isOwner).length === 0 ? (
                                    <div className="text-center py-5 rounded shadow-sm border" style={{ backgroundColor: 'var(--surface-card)', borderColor: 'var(--surface-border)' }}>
                                        <i className="pi pi-users text-secondary mb-3" style={{ fontSize: '3rem' }}></i>
                                        <h4 className="fw-bold" style={{ color: 'var(--text-color)' }}>No tienes archivos compartidos</h4>
                                        <p className="text-secondary">Tus amigos aún no te han compartido archivos.</p>
                                    </div>
                                ) : (
                                    <div className="d-flex flex-column gap-4">
                                        <h3 className="fw-bold text-dark mb-4 border-start border-success border-4 ps-3 mobile-section-title">Compartidos conmigo</h3>
                                        <div className="row g-4">
                                            {books.filter(b => !b.isOwner).slice(firstShared, firstShared + rows).map(renderBookCard)}
                                        </div>
                                        {books.filter(b => !b.isOwner).length > rows && (
                                            <Paginator first={firstShared} rows={rows} totalRecords={books.filter(b => !b.isOwner).length} onPageChange={(e) => setFirstShared(e.first)} className="mt-4 bg-transparent border-0" />
                                        )}
                                    </div>
                                )
                            )}

                            {activeTab === 'favorites' && (
                                <div className="d-flex flex-column gap-4">
                                    <h3 className="fw-normal mb-4 border-start border-danger border-4 ps-3 mobile-section-title" style={{ color: 'var(--text-color)' }}>Tus Favoritos</h3>
                                    {books.filter(b => b.isFavorited).length === 0 ? (
                                        <div className="text-center py-5 rounded shadow-sm border" style={{ backgroundColor: 'var(--surface-card)', borderColor: 'var(--surface-border)' }}>
                                            <i className="pi pi-heart text-secondary mb-3" style={{ fontSize: '3rem' }}></i>
                                            <h4 className="fw-bold" style={{ color: 'var(--text-color)' }}>No tienes libros favoritos aún</h4>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="row g-4">
                                                {books.filter(b => b.isFavorited).slice(firstFav, firstFav + rows).map(renderBookCard)}
                                            </div>
                                            {books.filter(b => b.isFavorited).length > rows && (
                                                <Paginator first={firstFav} rows={rows} totalRecords={books.filter(b => b.isFavorited).length} onPageChange={(e) => setFirstFav(e.first)} className="mt-4 bg-transparent border-0" />
                                            )}
                                        </>
                                    )}
                                </div>
                            )}

                            {activeTab === 'lists' && (
                                <div className="d-flex flex-column gap-4">
                                    {selectedListId ? (() => {
                                        const selList = customLists.find(l => l.id === selectedListId);
                                        if (!selList) {
                                            setSelectedListId(null);
                                            return null;
                                        }
                                        const listBookIds = selList.books?.map((b: any) => b.id) || [];
                                        const booksInList = books.filter(b => listBookIds.includes(b.id));

                                        return (
                                            <div className="d-flex flex-column gap-4">
                                                <div className="d-flex align-items-center gap-3">
                                                    <Button icon="pi pi-arrow-left" rounded text severity="secondary" onClick={() => setSelectedListId(null)} />
                                                    <h3 className="fw-bold text-dark mb-0">{selList.name}</h3>
                                                </div>
                                                {booksInList.length === 0 ? (
                                                    <div className="text-center py-5 rounded shadow-sm border" style={{ backgroundColor: 'var(--surface-card)', borderColor: 'var(--surface-border)' }}>
                                                        <i className="pi pi-list text-secondary mb-3" style={{ fontSize: '3rem' }}></i>
                                                        <h4 className="fw-bold" style={{ color: 'var(--text-color)' }}>No hay libros en esta lista</h4>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="row g-4">
                                                            {booksInList.slice(firstList, firstList + rows).map(renderBookCard)}
                                                        </div>
                                                        {booksInList.length > rows && (
                                                            <Paginator first={firstList} rows={rows} totalRecords={booksInList.length} onPageChange={(e) => setFirstList(e.first)} className="mt-4 bg-transparent border-0" />
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })() : (
                                        <>
                                            <div className="d-flex justify-content-between align-items-center mb-4">
                                                <h3 className="fw-normal border-start border-info border-4 ps-3 m-0 mobile-section-title" style={{ color: 'var(--text-color)' }}>Mis Listas Personalizadas</h3>
                                                <Button
                                                    label="Crear lista"
                                                    icon="pi pi-plus"
                                                    className="p-button-sm p-button-primary"
                                                    onClick={() => openListModal(null)}
                                                />
                                            </div>
                                            {customLists.length === 0 ? (
                                                <div className="text-center py-5 rounded shadow-sm border" style={{ backgroundColor: 'var(--surface-card)', borderColor: 'var(--surface-border)' }}>
                                                    <i className="pi pi-list text-secondary mb-3" style={{ fontSize: '3rem' }}></i>
                                                    <h4 className="fw-bold" style={{ color: 'var(--text-color)' }}>No tienes listas personalizadas</h4>
                                                    <p className="text-secondary">¡Crea una para organizar tus libros!</p>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="row g-4">
                                                        {customLists.slice(firstCustomLists, firstCustomLists + rows).map(list => (
                                                            <div key={list.id} className="col-12 col-md-6 col-lg-3 mb-4">
                                                                <Card className="h-100 shadow-sm border-0 card-hover-effect cursor-pointer" onClick={() => setSelectedListId(list.id)} style={{ cursor: 'pointer' }}>
                                                                    <div className="d-flex justify-content-between align-items-start mb-3">
                                                                        <h5 className="fw-bold text-dark mb-0">{list.name}</h5>
                                                                        <Badge
                                                                            value=""
                                                                            severity="secondary"
                                                                            className="p-2"
                                                                        >
                                                                            <i className={`pi ${list.visibility === 'private' ? 'pi-lock' : list.visibility === 'friends' ? 'pi-users' : 'pi-globe'}`}></i>
                                                                        </Badge>
                                                                    </div>
                                                                    <p className="text-secondary fw-bold mb-4">{list.books ? list.books.length : 0} libros guardados</p>
                                                                    <div className="d-flex justify-content-between align-items-center w-100 mt-auto pt-3 border-top border-secondary border-opacity-10">
                                                                        <div className="d-flex gap-3">
                                                                            <Button label="Ver libros" link className="p-0 fw-bold" onClick={(e) => { e.stopPropagation(); setSelectedListId(list.id); }} />
                                                                            <Button label="Gestionar" link severity="secondary" className="p-0 fw-bold" onClick={(e) => { e.stopPropagation(); openListModal(null); }} />
                                                                        </div>
                                                                        <Button icon="pi pi-trash" rounded text severity="danger" aria-label="Eliminar lista" onClick={(e) => handleDeleteList(list.id, e)} tooltip="Eliminar lista" />
                                                                    </div>
                                                                </Card>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {customLists.length > rows && (
                                                        <Paginator first={firstCustomLists} rows={rows} totalRecords={customLists.length} onPageChange={(e) => setFirstCustomLists(e.first)} className="mt-4 bg-transparent border-0" />
                                                    )}
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            <ListManagerModal
                isOpen={listModalOpen}
                onClose={() => {
                    setListModalOpen(false);
                    fetchLists();
                }}
                bookId={selectedBookForList}
            />
        </div>
    );
};
