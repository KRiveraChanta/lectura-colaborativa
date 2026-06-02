import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { SelectButton } from 'primereact/selectbutton';

interface ListManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    bookId: string | null;
}

export const ListManagerModal: React.FC<ListManagerModalProps> = ({ isOpen, onClose, bookId }) => {
    const { token } = useAuth();
    const [lists, setLists] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Create new list state
    const [isCreating, setIsCreating] = useState(false);
    const [newListName, setNewListName] = useState('');
    const [newListVisibility, setNewListVisibility] = useState<'private' | 'friends' | 'public'>('private');
    const [createLoading, setCreateLoading] = useState(false);

    const visibilityOptions = [
        { icon: 'pi pi-lock', value: 'private', label: 'Privado' },
        { icon: 'pi pi-users', value: 'friends', label: 'Amigos' },
        { icon: 'pi pi-globe', value: 'public', label: 'Público' }
    ];

    const itemTemplate = (option: any) => {
        return (
            <div className="d-flex align-items-center gap-2 px-2" title={option.label}>
                <i className={option.icon}></i>
                <span className="d-none d-sm-inline">{option.label}</span>
            </div>
        );
    };

    useEffect(() => {
        if (isOpen && token) {
            fetchLists();
        }
    }, [isOpen, token]);

    const fetchLists = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/lists', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setLists(data);
            }
        } catch (error) {
            console.error('Error fetching lists:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateList = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newListName.trim()) return;
        
        setCreateLoading(true);
        try {
            const res = await fetch('/api/lists', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: newListName, visibility: newListVisibility })
            });
            if (res.ok) {
                const newList = await res.json();
                setLists(prev => [...prev, newList]);
                setIsCreating(false);
                setNewListName('');
                setNewListVisibility('private');
                
                // If bookId is present, automatically add it to the newly created list
                if (bookId) {
                    await toggleBookInList(newList.id, false);
                }
            }
        } catch (error) {
            console.error('Error creating list:', error);
        } finally {
            setCreateLoading(false);
        }
    };

    const toggleBookInList = async (listId: string, isCurrentlyInList: boolean) => {
        if (!bookId || !token) return;
        
        // Optimistic UI update
        setLists(prev => prev.map(list => {
            if (list.id === listId) {
                const updatedBooks = isCurrentlyInList 
                    ? list.books?.filter((b: any) => b.id !== bookId) || []
                    : [...(list.books || []), { id: bookId }];
                return { ...list, books: updatedBooks };
            }
            return list;
        }));

        try {
            const method = isCurrentlyInList ? 'DELETE' : 'POST';
            await fetch(`/api/lists/${listId}/books/${bookId}`, {
                method,
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (error) {
            console.error('Error toggling book in list:', error);
            // Revert optimistic update on error
            fetchLists();
        }
    };

    const footer = (
        <div className="border-top pt-3 mt-2 w-100 bg-light p-3 rounded-bottom" style={{ margin: '-1rem' }}>
            {isCreating ? (
                <form onSubmit={handleCreateList} className="d-flex flex-column gap-3">
                    <InputText 
                        autoFocus
                        value={newListName}
                        onChange={(e) => setNewListName(e.target.value)}
                        placeholder="Nombre de la lista"
                        className="w-100"
                    />
                    
                    <SelectButton 
                        value={newListVisibility} 
                        onChange={(e) => e.value && setNewListVisibility(e.value)} 
                        options={visibilityOptions} 
                        itemTemplate={itemTemplate}
                        className="w-100"
                    />

                    <div className="d-flex gap-2 mt-2">
                        <Button 
                            type="button" 
                            label="Cancelar" 
                            severity="secondary" 
                            outlined 
                            className="flex-fill" 
                            onClick={() => setIsCreating(false)} 
                        />
                        <Button 
                            type="submit" 
                            label={createLoading ? 'Creando...' : 'Crear lista'} 
                            disabled={createLoading || !newListName.trim()} 
                            className="flex-fill shadow-sm" 
                        />
                    </div>
                </form>
            ) : (
                <Button 
                    label="Nueva lista" 
                    icon="pi pi-plus" 
                    severity="secondary" 
                    outlined 
                    className="w-100 border-dashed" 
                    style={{ borderStyle: 'dashed' }}
                    onClick={() => setIsCreating(true)} 
                />
            )}
        </div>
    );

    return (
        <Dialog 
            header="Añadir a lista" 
            visible={isOpen} 
            onHide={onClose}
            style={{ width: '90vw', maxWidth: '400px' }}
            footer={footer}
            className="shadow-lg border-0"
        >
            <div className="py-2" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
                {loading ? (
                    <div className="text-center py-4 text-secondary">
                        <i className="pi pi-spin pi-spinner" style={{ fontSize: '2rem' }}></i>
                        <p className="mt-2">Cargando tus listas...</p>
                    </div>
                ) : (
                    <div className="d-flex flex-column gap-2">
                        {lists.length === 0 && !isCreating ? (
                            <div className="text-center py-4 text-secondary">
                                No tienes listas personalizadas aún.
                            </div>
                        ) : (
                            lists.map(list => {
                                const hasBook = list.books?.some((b: any) => b.id === bookId);
                                const iconClass = list.visibility === 'private' ? 'pi-lock' : list.visibility === 'friends' ? 'pi-users' : 'pi-globe';
                                
                                return (
                                    <div 
                                        key={list.id}
                                        onClick={() => toggleBookInList(list.id, hasBook)}
                                        className="d-flex align-items-center justify-content-between p-3 rounded border border-light cursor-pointer card-hover-effect"
                                        style={{ backgroundColor: 'var(--surface-50)', transition: 'background-color 0.2s', cursor: 'pointer' }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-50)'}
                                    >
                                        <div className="d-flex flex-column gap-1">
                                            <span className="fw-bold" style={{ color: 'var(--text-color)' }}>{list.name}</span>
                                            <div className="d-flex align-items-center gap-1 small text-secondary fw-bold text-uppercase" style={{ fontSize: '0.7rem' }}>
                                                <i className={`pi ${iconClass}`} style={{ fontSize: '0.7rem' }}></i>
                                                <span>{list.visibility}</span>
                                                <span className="mx-1">•</span>
                                                <span>{list.books?.length || 0} libros</span>
                                            </div>
                                        </div>
                                        <div 
                                            className={`rounded-circle border d-flex align-items-center justify-content-center transition-all ${hasBook ? 'bg-primary border-primary' : 'border-secondary'}`}
                                            style={{ width: '24px', height: '24px' }}
                                        >
                                            {hasBook && <i className="pi pi-check text-white" style={{ fontSize: '12px' }}></i>}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>
        </Dialog>
    );
};
