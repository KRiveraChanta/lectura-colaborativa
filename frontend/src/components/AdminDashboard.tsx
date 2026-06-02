// @ts-nocheck
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDialog } from './ui/DialogProvider';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { TabView, TabPanel } from 'primereact/tabview';
import { Avatar } from 'primereact/avatar';
import { Dropdown } from 'primereact/dropdown';
import { Tag } from 'primereact/tag';

export function AdminDashboard() {
    const { token, user } = useAuth();
    const { alert, confirm } = useDialog();
    const [tags, setTags] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTag, setEditingTag] = useState<any | null>(null);
    const [tagName, setTagName] = useState('');

    // Users state
    const [users, setUsers] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any | null>(null);
    const [userRole, setUserRole] = useState('user');

    useEffect(() => {
        fetchTags();
        fetchUsers();
    }, [token]);

    const fetchTags = async () => {
        try {
            const res = await fetch('/api/tags', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTags(data);
            }
        } catch (error) {
            console.error('Error fetching tags:', error);
        } finally {
            setLoading(false);
        }
    };
    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoadingUsers(false);
        }
    };

    const handleSaveTag = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tagName.trim()) return;

        try {
            const url = editingTag
                ? `/api/tags/${editingTag.id}`
                : '/api/tags';
            const method = editingTag ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: tagName.trim() })
            });

            if (res.ok) {
                await fetchTags();
                setIsModalOpen(false);
                setEditingTag(null);
                setTagName('');
                alert({ title: 'Éxito', message: `Etiqueta ${editingTag ? 'actualizada' : 'creada'} correctamente`, type: 'success' });
            } else {
                const data = await res.json();
                alert({ title: 'Error', message: data.message || 'Error al guardar etiqueta', type: 'error' });
            }
        } catch (error) {
            console.error('Error saving tag:', error);
            alert({ title: 'Error', message: 'Error de conexión', type: 'error' });
        }
    };

    const handleDeleteTag = async (id: string, name: string) => {
        const confirmed = await confirm({ title: '¿Eliminar etiqueta?', message: `¿Estás seguro de eliminar la etiqueta "${name}"?`, type: 'warning' });
        if (!confirmed) return;

        try {
            const res = await fetch(`/api/tags/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                await fetchTags();
                alert({ title: 'Éxito', message: 'Etiqueta eliminada', type: 'success' });
            } else {
                const data = await res.json();
                alert({ title: 'Error', message: data.message || 'Error al eliminar', type: 'error' });
            }
        } catch (error) {
            console.error('Error deleting tag:', error);
            alert({ title: 'Error', message: 'Error de conexión', type: 'error' });
        }
    };

    const handleSaveUserRole = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;

        try {
            const res = await fetch(`/api/users/${editingUser.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ role: userRole })
            });

            if (res.ok) {
                await fetchUsers();
                setIsUserModalOpen(false);
                setEditingUser(null);
                alert({ title: 'Éxito', message: 'Rol de usuario actualizado', type: 'success' });
            } else {
                const data = await res.json();
                alert({ title: 'Error', message: data.message || 'Error al actualizar usuario', type: 'error' });
            }
        } catch (error) {
            console.error('Error updating user:', error);
            alert({ title: 'Error', message: 'Error de conexión', type: 'error' });
        }
    };

    const handleDeleteUser = async (id: string, username: string) => {
        const confirmed = await confirm({ title: '¿Eliminar usuario?', message: `¿Estás seguro de eliminar permanentemente al usuario "${username}"? Esta acción no se puede deshacer.`, type: 'danger' });
        if (!confirmed) return;

        try {
            const res = await fetch(`/api/users/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                await fetchUsers();
                alert({ title: 'Éxito', message: 'Usuario eliminado permanentemente', type: 'success' });
            } else {
                const data = await res.json();
                alert({ title: 'Error', message: data.message || 'Error al eliminar', type: 'error' });
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            alert({ title: 'Error', message: 'Error de conexión', type: 'error' });
        }
    };

    const openModal = (tag?: any) => {
        if (tag) {
            setEditingTag(tag);
            setTagName(tag.name);
        } else {
            setEditingTag(null);
            setTagName('');
        }
        setIsModalOpen(true);
    };

    const openUserModal = (userItem: any) => {
        setEditingUser(userItem);
        setUserRole(userItem.role || 'user');
        setIsUserModalOpen(true);
    };

    if (user?.role !== 'admin') {
        return (
            <div className="d-flex justify-content-center align-items-center min-vh-100">
                <h3 className="text-secondary fw-bold">Acceso denegado</h3>
            </div>
        );
    }

    const actionBodyTemplate = (rowData: any) => {
        return (
            <div className="d-flex gap-2 justify-content-end">
                <Button icon="pi pi-pencil" rounded text severity="info" onClick={() => openModal(rowData)} tooltip="Editar" />
                <Button icon="pi pi-trash" rounded text severity="danger" onClick={() => handleDeleteTag(rowData.id, rowData.name)} tooltip="Eliminar" />
            </div>
        );
    };

    const userActionBodyTemplate = (rowData: any) => {
        return (
            <div className="d-flex gap-2 justify-content-end">
                <Button icon="pi pi-pencil" rounded text severity="info" onClick={() => openUserModal(rowData)} tooltip="Cambiar Rol" disabled={rowData.id === user.id} />
                <Button icon="pi pi-trash" rounded text severity="danger" onClick={() => handleDeleteUser(rowData.id, rowData.username)} tooltip="Eliminar Usuario" disabled={rowData.id === user.id} />
            </div>
        );
    };

    const userRoleBodyTemplate = (rowData: any) => {
        return (
            <Tag severity={rowData.role === 'admin' ? 'danger' : 'info'} value={rowData.role === 'admin' ? 'Administrador' : 'Usuario'} rounded></Tag>
        );
    };

    const userAvatarBodyTemplate = (rowData: any) => {
        return (
            <div className="d-flex align-items-center gap-2">
                {rowData.avatarUrl ? (
                    <Avatar image={rowData.avatarUrl} shape="circle" />
                ) : (
                    <Avatar label={rowData.username.charAt(0).toUpperCase()} shape="circle" className="bg-primary text-white" />
                )}
                <span className="fw-bold">{rowData.username}</span>
            </div>
        );
    };

    const footer = (
        <div className="d-flex gap-2 justify-content-end">
            <Button label="Cancelar" icon="pi pi-times" onClick={() => setIsModalOpen(false)} className="p-button-text p-button-secondary" />
            <Button label="Guardar" icon="pi pi-check" onClick={handleSaveTag} disabled={!tagName.trim()} autoFocus />
        </div>
    );

    const userFooter = (
        <div className="d-flex gap-2 justify-content-end">
            <Button label="Cancelar" icon="pi pi-times" onClick={() => setIsUserModalOpen(false)} className="p-button-text p-button-secondary" />
            <Button label="Guardar" icon="pi pi-check" onClick={handleSaveUserRole} autoFocus />
        </div>
    );

    const roleOptions = [
        { label: 'Usuario', value: 'user' },
        { label: 'Administrador', value: 'admin' }
    ];

    return (
        <div className="container py-5 min-vh-100" style={{ backgroundColor: 'var(--surface-ground)' }}>
            <div className="mx-auto" style={{ maxWidth: '1000px' }}>
                <h2 className="display-6 fw-bolder mb-5 d-flex align-items-center gap-3" style={{ color: 'var(--text-color)' }}>
                    <i className="pi pi-cog"></i> Panel de Administrador
                </h2>

                <TabView className="shadow-sm rounded-4 overflow-hidden bg-white">
                    <TabPanel header="Etiquetas" leftIcon="pi pi-tags me-2">
                        <div className="p-3">
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <h3 className="fw-bold m-0 d-flex align-items-center gap-2" style={{ color: 'var(--text-color)' }}>
                                    <i className="pi pi-tags text-primary"></i> Gestión de Etiquetas
                                </h3>
                                <Button label="Nueva Etiqueta" icon="pi pi-plus" onClick={() => openModal()} className="p-button-primary shadow-sm" />
                            </div>

                            <DataTable value={tags} loading={loading} emptyMessage="No hay etiquetas creadas." className="p-datatable-sm" stripedRows>
                                <Column field="name" header="Nombre" className="fw-bold"></Column>
                                <Column body={actionBodyTemplate} exportable={false} style={{ minWidth: '8rem' }}></Column>
                            </DataTable>
                        </div>
                    </TabPanel>

                    <TabPanel header="Usuarios" leftIcon="pi pi-users me-2">
                        <div className="p-3">
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <h3 className="fw-bold m-0 d-flex align-items-center gap-2" style={{ color: 'var(--text-color)' }}>
                                    <i className="pi pi-users text-primary"></i> Gestión de Usuarios
                                </h3>
                            </div>

                            <DataTable value={users} loading={loadingUsers} emptyMessage="No hay usuarios registrados." className="p-datatable-sm" stripedRows paginator rows={10}>
                                <Column header="Usuario" body={userAvatarBodyTemplate}></Column>
                                <Column field="email" header="Correo"></Column>
                                <Column header="Rol" body={userRoleBodyTemplate}></Column>
                                <Column body={userActionBodyTemplate} exportable={false} style={{ minWidth: '8rem' }}></Column>
                            </DataTable>
                        </div>
                    </TabPanel>
                </TabView>
            </div>

            <Dialog
                header={editingTag ? 'Editar Etiqueta' : 'Nueva Etiqueta'}
                visible={isModalOpen}
                style={{ width: '90vw', maxWidth: '400px' }}
                onHide={() => setIsModalOpen(false)}
                footer={footer}
                className="shadow-lg border-0"
            >
                <form onSubmit={handleSaveTag} className="d-flex flex-column gap-3 pt-2">
                    <div>
                        <label className="fw-bold text-secondary small mb-2">Nombre</label>
                        <InputText
                            value={tagName}
                            onChange={(e) => setTagName(e.target.value)}
                            className="w-100"
                            autoFocus
                            required
                        />
                    </div>
                </form>
            </Dialog>

            <Dialog
                header={editingUser ? `Editar Rol de ${editingUser.username}` : 'Editar Usuario'}
                visible={isUserModalOpen}
                style={{ width: '90vw', maxWidth: '400px' }}
                onHide={() => setIsUserModalOpen(false)}
                footer={userFooter}
                className="shadow-lg border-0"
            >
                <form onSubmit={handleSaveUserRole} className="d-flex flex-column gap-3 pt-2">
                    <div>
                        <label className="fw-bold text-secondary small mb-2">Rol del Usuario</label>
                        <Dropdown 
                            value={userRole} 
                            options={roleOptions} 
                            onChange={(e) => setUserRole(e.value)} 
                            className="w-100" 
                            placeholder="Selecciona un rol" 
                        />
                        <small className="text-secondary d-block mt-2">
                            Los administradores tienen acceso completo a la gestión de etiquetas y usuarios.
                        </small>
                    </div>
                </form>
            </Dialog>
        </div>
    );
}
