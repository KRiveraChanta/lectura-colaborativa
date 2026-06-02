import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { useDialog } from './ui/DialogProvider';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Avatar } from 'primereact/avatar';
import { Badge } from 'primereact/badge';

export const UploadBookForm = () => {
    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [description, setDescription] = useState('');
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [coverUrl, setCoverUrl] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [visibility, setVisibility] = useState<'public' | 'private' | 'restricted'>('public');
    const [pagesPerSection, setPagesPerSection] = useState<number>(5);
    const [friends, setFriends] = useState<any[]>([]);
    const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
    const [availableTags, setAvailableTags] = useState<any[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const { token, isAuthenticated } = useAuth();
    const { alert } = useDialog();
    const navigate = useNavigate();

    const visibilityOptions = [
        { label: 'Público (Cualquiera puede verlo)', value: 'public' },
        { label: 'Privado (Solo yo)', value: 'private' },
        { label: 'Restringido (Solo amigos seleccionados)', value: 'restricted' }
    ];

    useEffect(() => {
        if ((visibility === 'restricted' || visibility === 'public') && friends.length === 0 && isAuthenticated) {
            fetch('/api/friends/list', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => res.json())
            .then(data => setFriends(data))
            .catch(err => console.error(err));
        }
    }, [visibility, token, isAuthenticated, friends.length]);

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

    const handleFriendToggle = (friendId: string, e: any) => {
        if (e.checked) {
            setSelectedFriends(prev => [...prev, friendId]);
        } else {
            setSelectedFriends(prev => prev.filter(id => id !== friendId));
        }
    };

    const handleTagToggle = (tagId: string) => {
        setSelectedTags(prev => 
            prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return await alert({ title: 'Atención', message: 'Por favor sube un archivo .txt o .pdf', type: 'warning' });
        if (visibility === 'restricted' && selectedFriends.length === 0) {
            return await alert({ title: 'Atención', message: 'Debes seleccionar al menos un amigo para el acceso restringido.', type: 'warning' });
        }
        
        const isPdf = file.name.toLowerCase().endsWith('.pdf');

        const formData = new FormData();
        formData.append('title', title);
        formData.append('author', author);
        formData.append('description', description);
        formData.append('file', file);
        formData.append('visibility', visibility);
        if (coverUrl) {
            formData.append('coverUrl', coverUrl);
        }
        if (isPdf) {
            formData.append('pagesPerSection', pagesPerSection.toString());
        }
        if (visibility === 'restricted' || visibility === 'public') {
            formData.append('allowedUsers', JSON.stringify(selectedFriends));
        }
        if (selectedTags.length > 0) {
            formData.append('tags', JSON.stringify(selectedTags));
        }

        try {
            const res = await fetch('/api/books/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                
                if (coverFile) {
                    const coverFormData = new FormData();
                    coverFormData.append('cover', coverFile);
                    await fetch(`/api/books/${data.bookId}/cover`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` },
                        body: coverFormData
                    }).catch(e => console.error("Error subiendo portada", e));
                }

                await alert({ title: '¡Éxito!', message: `Libro procesado exitosamente en ${data.sectionsInfo} secciones.`, type: 'success' });
                setTitle('');
                setAuthor('');
                setDescription('');
                setCoverFile(null);
                setFile(null);
                setVisibility('public');
                setSelectedFriends([]);
                setSelectedTags([]);
                navigate(-1);
            } else {
                const errorData = await res.json();
                await alert({ title: 'Error', message: `Error al procesar: ${errorData.message}`, type: 'error' });
            }
        } catch (error) {
            await alert({ title: 'Error', message: `Error de red al subir el archivo: ${(error as Error).message}`, type: 'error' });
        }
    };

    return (
        <div className="container py-5 min-vh-100" style={{ backgroundColor: 'var(--surface-ground)' }}>
            <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '800px' }}>
                <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between mb-4 gap-3 border-bottom pb-3">
                    <h2 className="fs-4 fw-bold m-0 text-dark">Sube tu propio libro (.txt o .pdf)</h2>
                    <Button 
                        label="Volver atrás" 
                        icon="pi pi-arrow-left" 
                        className="p-button-sm p-button-outlined p-button-secondary"
                        onClick={() => navigate(-1)}
                    />
                </div>
                
                <form onSubmit={handleSubmit} className="d-flex flex-column gap-4">
                    <div className="row g-3">
                        <div className="col-12">
                            <label className="fw-bold mb-2 text-secondary small">Título *</label>
                            <InputText
                                required
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-100"
                                placeholder="El señor de los anillos"
                            />
                        </div>
                        <div className="col-12">
                            <label className="fw-bold mb-2 text-secondary small">Autor *</label>
                            <InputText
                                required
                                value={author}
                                onChange={e => setAuthor(e.target.value)}
                                className="w-100"
                                placeholder="J.R.R. Tolkien"
                            />
                        </div>
                        <div className="col-12">
                            <label className="fw-bold mb-2 text-secondary small">Descripción o Sinopsis (Opcional)</label>
                            <InputTextarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={4}
                                className="w-100"
                                placeholder="Escribe de qué trata el libro..."
                                autoResize
                            />
                        </div>
                    </div>
                    
                    <div className="p-4 bg-light rounded border">
                        <label className="fw-bold mb-3 text-secondary small d-block">Imagen de Portada (Opcional)</label>
                        <div className="d-flex flex-column gap-3">
                            <div>
                                <label className="small text-secondary mb-1">Subir archivo:</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={e => {
                                        setCoverFile(e.target.files ? e.target.files[0] : null);
                                        if (e.target.files && e.target.files.length > 0) setCoverUrl('');
                                    }}
                                    className="form-control"
                                />
                            </div>
                            <div className="d-flex align-items-center gap-3">
                                <span className="small text-secondary fw-bold text-uppercase">o URL:</span>
                                <InputText
                                    type="url"
                                    placeholder="https://ejemplo.com/imagen.jpg"
                                    value={coverUrl}
                                    onChange={e => {
                                        setCoverUrl(e.target.value);
                                        if (e.target.value) setCoverFile(null);
                                    }}
                                    className="flex-grow-1 p-inputtext-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="p-4 rounded border bg-light">
                        <label className="fw-bold mb-2 text-primary small d-block">Archivo del Libro (.txt o .pdf) *</label>
                        <input
                            required
                            type="file"
                            accept=".txt,.pdf"
                            onChange={e => setFile(e.target.files ? e.target.files[0] : null)}
                            className="form-control border-primary"
                        />
                    </div>
                    
                    {file && file.name.toLowerCase().endsWith('.pdf') && (
                        <div className="col-12">
                            <label className="fw-bold mb-2 text-secondary small">Páginas por sección (PDF)</label>
                            <InputText
                                type="number"
                                min={1}
                                max={50}
                                value={pagesPerSection.toString()}
                                onChange={e => setPagesPerSection(parseInt(e.target.value))}
                                className="w-100"
                            />
                        </div>
                    )}

                    <div className="col-12">
                        <label className="fw-bold mb-2 text-secondary small">Visibilidad</label>
                        <Dropdown 
                            value={visibility} 
                            onChange={(e) => setVisibility(e.value)} 
                            options={visibilityOptions} 
                            className="w-100" 
                        />
                    </div>

                    {(visibility === 'restricted' || visibility === 'public') && (
                        <div className="p-4 bg-light rounded border">
                            <label className="fw-bold mb-3 text-secondary small d-block">
                                {visibility === 'restricted' ? 'Selecciona qué amigos podrán leerlo:' : 'Selecciona qué amigos tendrán permiso de anotar (Opcional):'}
                            </label>
                            {friends.length === 0 ? (
                                <p className="small text-secondary">No tienes amigos o cargando...</p>
                            ) : (
                                <div className="d-flex flex-column gap-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                    {friends.map(friend => (
                                        <div key={friend.id} className="d-flex align-items-center p-2 rounded card-hover-effect cursor-pointer" style={{ backgroundColor: 'var(--surface-0)' }}>
                                            <Checkbox 
                                                inputId={`friend-${friend.id}`} 
                                                checked={selectedFriends.includes(friend.id)} 
                                                onChange={(e) => handleFriendToggle(friend.id, e)} 
                                                className="me-3"
                                            />
                                            <label htmlFor={`friend-${friend.id}`} className="d-flex align-items-center gap-2 cursor-pointer m-0 flex-grow-1">
                                                {friend.avatarUrl ? (
                                                    <Avatar image={`${friend.avatarUrl}`} shape="circle" size="small" />
                                                ) : (
                                                    <Avatar label={friend.username.charAt(0).toUpperCase()} shape="circle" size="small" className="bg-primary text-white" />
                                                )}
                                                <span className="fw-bold text-dark">{friend.username}</span>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="col-12">
                        <label className="fw-bold mb-2 text-secondary small">Etiquetas (Opcional)</label>
                        <div className="d-flex flex-wrap gap-2">
                            {availableTags.length === 0 ? (
                                <span className="small text-secondary">No hay etiquetas disponibles.</span>
                            ) : (
                                availableTags.map(tag => (
                                    <Button
                                        key={tag.id}
                                        type="button"
                                        label={tag.name}
                                        outlined={!selectedTags.includes(tag.id)}
                                        severity={selectedTags.includes(tag.id) ? 'primary' : 'secondary'}
                                        onClick={() => handleTagToggle(tag.id)}
                                        className="p-button-sm p-button-rounded"
                                    />
                                ))
                            )}
                        </div>
                    </div>

                    <div className="pt-3 border-top mt-2">
                        <Button 
                            type="submit" 
                            label="Procesar Libro" 
                            icon="pi pi-upload" 
                            className="p-button-lg w-100 shadow-sm" 
                        />
                    </div>
                </form>
            </Card>
        </div>
    );
};
