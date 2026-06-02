import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Avatar } from 'primereact/avatar';
import { Dialog } from 'primereact/dialog';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../utils/cropImage';

export const Profile = () => {
    const { user, token, updateUser, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    const [username, setUsername] = useState(user?.username || '');
    const [email, setEmail] = useState(user?.email || '');
    const [bio, setBio] = useState(user?.bio || '');
    const [password, setPassword] = useState('');
    const [avatar, setAvatar] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(
        user?.avatarUrl ? `${user.avatarUrl}` : null
    );
    const [cover, setCover] = useState<File | null>(null);
    const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(
        (user as any)?.coverUrl ? `${(user as any).coverUrl}` : null
    );

    useEffect(() => {
        if (user) {
            setUsername(user.username || '');
            setEmail(user.email || '');
            setBio(user.bio || '');
            setPreviewUrl(user.avatarUrl ? `${user.avatarUrl}` : null);
            setCoverPreviewUrl((user as any).coverUrl ? `${(user as any).coverUrl}` : null);
        }
    }, [user]);

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    // Cropper states
    const [tempImage, setTempImage] = useState<string | null>(null);
    const [cropType, setCropType] = useState<'avatar' | 'cover'>('avatar');
    const [showCropper, setShowCropper] = useState(false);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
        }
    }, [isAuthenticated, navigate]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setTempImage(reader.result?.toString() || null);
                setCropType(type);
                setShowCropper(true);
            });
            reader.readAsDataURL(file);
        }
    };

    const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    };

    const handleCropImage = async () => {
        try {
            if (tempImage && croppedAreaPixels) {
                const croppedImageFile = await getCroppedImg(tempImage, croppedAreaPixels, cropType === 'avatar' ? 'avatar_cropped.jpg' : 'cover_cropped.jpg');
                if (croppedImageFile) {
                    if (cropType === 'avatar') {
                        setAvatar(croppedImageFile);
                        setPreviewUrl(URL.createObjectURL(croppedImageFile));
                    } else {
                        setCover(croppedImageFile);
                        setCoverPreviewUrl(URL.createObjectURL(croppedImageFile));
                    }
                }
            }
        } catch (e) {
            console.error(e);
        }
        setShowCropper(false);
        setTempImage(null);
    };

    const handleCancelCrop = () => {
        setShowCropper(false);
        setTempImage(null);
    };

    const hasChanges = 
        username !== (user?.username || '') ||
        email !== (user?.email || '') ||
        bio !== (user?.bio || '') ||
        password !== '' ||
        avatar !== null ||
        cover !== null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;

        setLoading(true);
        setMessage({ text: '', type: '' });

        const formData = new FormData();
        formData.append('username', username);
        formData.append('email', email);
        formData.append('bio', bio);
        if (password) formData.append('password', password);
        if (avatar) formData.append('avatar', avatar);
        if (cover) formData.append('cover', cover);

        try {
            const res = await fetch('/api/auth/profile', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await res.json();

            if (res.ok) {
                setMessage({ text: 'Perfil actualizado exitosamente', type: 'success' });
                updateUser(data.user);
                if (data.token) {
                    localStorage.setItem('token', data.token); // update local token if username changed
                }
                setPassword(''); // clear password field
            } else {
                setMessage({ text: data.message || 'Error al actualizar', type: 'error' });
            }
        } catch (error) {
            setMessage({ text: 'Error de red al actualizar perfil', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container py-5 min-vh-100" style={{ backgroundColor: 'var(--surface-ground)' }}>
            <div className="mx-auto" style={{ maxWidth: '800px' }}>
                <div className="mb-5 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                    <div>
                        <h2 className="display-6 fw-bolder text-dark mb-2">Editar Perfil</h2>
                        <p className="lead text-secondary m-0">Gestiona tu información personal y foto de perfil.</p>
                    </div>
                    <Button 
                        label="Volver a mi perfil público" 
                        icon="pi pi-arrow-left" 
                        onClick={() => navigate(`/profile/${user?.id}`)} 
                        className="p-button-outlined p-button-secondary shadow-sm"
                    />
                </div>

                <Card className="shadow-sm border-0 mb-5">
                    {message.text && (
                        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-danger'} fw-bold mb-4`} role="alert">
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="d-flex flex-column gap-4">
                        <div className="d-flex justify-content-end border-bottom pb-4">
                            <Button
                                type="submit"
                                label={loading ? 'Guardando...' : 'Guardar Cambios'}
                                disabled={loading || !hasChanges}
                                icon={loading ? 'pi pi-spin pi-spinner' : 'pi pi-save'}
                                severity={hasChanges ? "success" : "secondary"}
                                className="p-button-lg px-5 shadow-sm"
                                tooltip={!hasChanges ? "No hay cambios por guardar" : undefined}
                                tooltipOptions={{ position: 'bottom' }}
                            />
                        </div>

                        <div className="d-flex flex-column align-items-center mb-5 border-bottom pb-4">
                            <div className="position-relative mb-3">
                                {previewUrl ? (
                                    <Avatar image={previewUrl} shape="circle" className="shadow-sm flex-shrink-0" style={{ width: '100px', height: '100px', minWidth: '100px', minHeight: '100px' }} />
                                ) : (
                                    <Avatar label={username ? username.charAt(0).toUpperCase() : '?'} shape="circle" className="bg-primary text-white shadow-sm flex-shrink-0" style={{ width: '100px', height: '100px', minWidth: '100px', minHeight: '100px', fontSize: '2.5rem' }} />
                                )}
                                <label className="position-absolute bottom-0 end-0 bg-primary text-white rounded-circle d-flex align-items-center justify-content-center cursor-pointer shadow-sm" style={{ width: '32px', height: '32px', cursor: 'pointer' }}>
                                    <i className="pi pi-camera" style={{ fontSize: '0.9rem' }}></i>
                                    <input type="file" className="d-none" accept="image/*" onChange={(e) => handleFileChange(e, 'avatar')} />
                                </label>
                            </div>
                            <p className="small text-secondary fw-bold m-0 mb-4">Haz clic en la cámara para cambiar tu foto redonda</p>

                            {/* Portada */}
                            <div className="position-relative w-100 rounded bg-light mb-2 overflow-hidden shadow-sm d-flex align-items-center justify-content-center" style={{ height: '180px', backgroundImage: coverPreviewUrl ? `url(${coverPreviewUrl})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                                {!coverPreviewUrl && <i className="pi pi-image text-secondary" style={{ fontSize: '2rem', opacity: 0.5 }}></i>}
                                <label className="position-absolute bottom-0 end-0 m-3 bg-primary text-white rounded-circle d-flex align-items-center justify-content-center cursor-pointer shadow-sm border border-2 border-white" style={{ width: '45px', height: '45px', cursor: 'pointer' }}>
                                    <i className="pi pi-camera" style={{ fontSize: '1.2rem' }}></i>
                                    <input type="file" className="d-none" accept="image/*" onChange={(e) => handleFileChange(e, 'cover')} />
                                </label>
                            </div>
                            <p className="small text-secondary fw-bold m-0">Foto de portada (formato rectangular panorámico)</p>
                        </div>

                        <div className="row g-4">
                            <div className="col-12 col-md-6">
                                <label className="fw-bold mb-2 text-secondary small">Nombre de Usuario</label>
                                <InputText
                                    type="text"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    className="w-100"
                                    required
                                />
                            </div>
                            <div className="col-12 col-md-6">
                                <label className="fw-bold mb-2 text-secondary small">Correo Electrónico</label>
                                <InputText
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-100"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="fw-bold mb-2 text-secondary small">
                                Sobre Mí / Presentación <span className="fw-normal">(Máx. 120 caracteres)</span>
                            </label>
                            <InputTextarea
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                rows={3}
                                maxLength={120}
                                className="w-100"
                                placeholder="Cuéntanos un poco sobre ti, tus libros favoritos..."
                                autoResize
                            />
                        </div>

                        <div>
                            <label className="fw-bold mb-2 text-secondary small">
                                Nueva Contraseña <span className="fw-normal">(Opcional)</span>
                            </label>
                            <InputText
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Déjalo en blanco para no cambiarla"
                                className="w-100"
                            />
                        </div>

                    </form>
                </Card>

            </div>

            <Dialog header="Recortar Foto de Perfil" visible={showCropper} style={{ width: '90vw', maxWidth: '600px' }} onHide={handleCancelCrop} footer={
                <div>
                    <Button label="Cancelar" icon="pi pi-times" onClick={handleCancelCrop} className="p-button-text" />
                    <Button label="Recortar y Guardar" icon="pi pi-check" onClick={handleCropImage} autoFocus />
                </div>
            }>
                <div style={{ position: 'relative', width: '100%', height: '400px', backgroundColor: '#333' }}>
                    {tempImage && (
                        <Cropper
                            image={tempImage}
                            crop={crop}
                            zoom={zoom}
                            aspect={cropType === 'avatar' ? 1 : 3 / 1}
                            cropShape={cropType === 'avatar' ? 'round' : 'rect'}
                            showGrid={false}
                            onCropChange={setCrop}
                            onCropComplete={onCropComplete}
                            onZoomChange={setZoom}
                        />
                    )}
                </div>
            </Dialog>

        </div>
    );
};
