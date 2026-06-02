import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Avatar } from 'primereact/avatar';

export function FriendRequestsPage() {
    const { token, isAuthenticated } = useAuth();
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isAuthenticated) {
            fetchPendingRequests();
        }
    }, [isAuthenticated, token]);

    const fetchPendingRequests = async () => {
        try {
            const res = await fetch('/api/friends/pending', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setPendingRequests(data);
            }
        } catch (error) {
            console.error('Error fetching pending requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptRequest = async (requestId: string) => {
        try {
            const res = await fetch(`/api/friends/accept/${requestId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                fetchPendingRequests();
            }
        } catch (error) {
            console.error('Error accepting request:', error);
        }
    };

    const handleRejectRequest = async (requestId: string) => {
        try {
            const res = await fetch(`/api/friends/reject/${requestId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                fetchPendingRequests();
            }
        } catch (error) {
            console.error('Error rejecting request:', error);
        }
    };

    if (!isAuthenticated) return null;

    return (
        <div className="container py-5 min-vh-100" style={{ backgroundColor: 'var(--surface-ground)' }}>
            <div className="mx-auto" style={{ maxWidth: '800px' }}>
                <div className="mb-5">
                    <h2 className="display-6 fw-bolder text-dark mb-2">Solicitudes de Amistad</h2>
                    <p className="lead text-secondary m-0">Administra las personas que quieren conectar contigo.</p>
                </div>

                <Card className="shadow-sm border-0">
                    {loading ? (
                        <div className="text-center py-5">
                            <i className="pi pi-spin pi-spinner text-primary" style={{ fontSize: '2rem' }}></i>
                        </div>
                    ) : pendingRequests.length === 0 ? (
                        <div className="text-center py-5">
                            <i className="pi pi-users text-secondary mb-3" style={{ fontSize: '3rem' }}></i>
                            <h5 className="fw-bold text-secondary m-0">No tienes solicitudes pendientes.</h5>
                        </div>
                    ) : (
                        <div className="d-flex flex-column gap-3">
                            {pendingRequests.map(req => (
                                <div key={req.id} className="d-flex flex-column flex-sm-row align-items-center justify-content-between gap-3 p-3 rounded border bg-light">
                                    <div className="d-flex align-items-center gap-3 w-100">
                                        <Link to={`/profile/${req.requester.id}`} className="text-decoration-none flex-shrink-0">
                                            {req.requester.avatarUrl ? (
                                                <Avatar image={`${req.requester.avatarUrl}`} shape="circle" size="xlarge" className="shadow-sm card-hover-effect" />
                                            ) : (
                                                <Avatar label={req.requester.username.charAt(0).toUpperCase()} shape="circle" size="xlarge" className="bg-primary text-white shadow-sm card-hover-effect" />
                                            )}
                                        </Link>
                                        <div>
                                            <Link to={`/profile/${req.requester.id}`} className="text-decoration-none">
                                                <h5 className="fw-bold text-dark m-0 mb-1 hover-primary">{req.requester.username}</h5>
                                            </Link>
                                            <p className="small text-secondary m-0 fw-bold">quiere ser tu amigo</p>
                                        </div>
                                    </div>
                                    <div className="d-flex gap-2 w-100 justify-content-sm-end mt-2 mt-sm-0">
                                        <Button 
                                            label="Aceptar" 
                                            icon="pi pi-check" 
                                            onClick={() => handleAcceptRequest(req.id)}
                                            className="p-button-success shadow-sm flex-grow-1 flex-sm-grow-0"
                                        />
                                        <Button 
                                            label="Rechazar" 
                                            icon="pi pi-times" 
                                            onClick={() => handleRejectRequest(req.id)}
                                            className="p-button-secondary p-button-outlined shadow-sm flex-grow-1 flex-sm-grow-0"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
