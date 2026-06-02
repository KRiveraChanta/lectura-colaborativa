// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDialog } from './ui/DialogProvider';
import { Dialog } from 'primereact/dialog';
import { socket } from '../socket';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface HighlightData {
    id?: string;
    text: string;
    startIndex: number;
    endIndex: number;
    type?: string;
    style?: string;
    color?: string;
    rectangles?: any;
    userId?: string;
    user?: {
        id: string;
        username: string;
        avatarUrl?: string;
    };
    comments?: any[];
}

interface CollaboratorProgress {
    userId: string;
    username: string;
    avatarUrl?: string;
    sectionIndex: number;
    pdfPage?: number;
    updatedAt: string;
}

const HIGHLIGHT_COLORS = [
    { bg: 'hl-bg-yellow', text: 'text-dark', border: 'border-warning' },
    { bg: 'hl-bg-green', text: 'text-dark', border: 'border-success' },
    { bg: 'hl-bg-blue', text: 'text-dark', border: 'border-primary' },
    { bg: 'hl-bg-pink', text: 'text-dark', border: 'border-danger' },
    { bg: 'hl-bg-purple', text: 'text-dark', border: 'border-secondary' },
    { bg: 'hl-bg-orange', text: 'text-dark', border: 'border-warning' },
];

const getUserColor = (userId: string) => {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return HIGHLIGHT_COLORS[Math.abs(hash) % HIGHLIGHT_COLORS.length];
};

export const ReaderInterface = () => {
    const { bookId } = useParams<{ bookId: string }>();
    const navigate = useNavigate();
    const { token, isAuthenticated, user } = useAuth();
    const { alert, confirm } = useDialog();
    const [focusMode, setFocusMode] = useState(false);
    const [showAnnotations, setShowAnnotations] = useState(true);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 992);
    const [showAllFriendsCommentsModal, setShowAllFriendsCommentsModal] = useState(false);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 992);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [mobileTimelineOpen, setMobileTimelineOpen] = useState(false);
    const [progress, setProgress] = useState<number | null>(null);
    const [scrollProgress, setScrollProgress] = useState(0);
    
    const [sectionId, setSectionId] = useState<string | null>(null);
    const [sectionContent, setSectionContent] = useState('Cargando contenido...');
    const [totalSections, setTotalSections] = useState(1);
    const [currentBook, setCurrentBook] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [pdfCommentMode, setPdfCommentMode] = useState<number | null>(null);
    const [pdfCommentText, setPdfCommentText] = useState('');

    const [selectedHighlight, setSelectedHighlight] = useState<HighlightData | null>(null);
    const [savedHighlights, setSavedHighlights] = useState<HighlightData[]>([]);
    const [scrollToHighlightId, setScrollToHighlightId] = useState<string | null>(null);
    const lastScrolledSectionProgress = useRef<number | null>(null);
    
    const [collaborators, setCollaborators] = useState<CollaboratorProgress[]>([]);
    const [collabToNavigate, setCollabToNavigate] = useState<CollaboratorProgress | null>(null);

    // Estados para las nuevas funcionalidades
    const [friendsComments, setFriendsComments] = useState<any[]>([]);
    const [allAnnotations, setAllAnnotations] = useState<any[]>([]);
    const [showAnnotationsModal, setShowAnnotationsModal] = useState(false);
    const [filterType, setFilterType] = useState('all');
    const [filterAuthor, setFilterAuthor] = useState('all');
    const [filterDateSort, setFilterDateSort] = useState('desc');

    // Estados para selección y comentarios
    const [selectionMenu, setSelectionMenu] = useState<{ show: boolean, x: number, y: number } | null>(null);
    const [commentMode, setCommentMode] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [viewingComment, setViewingComment] = useState<any>(null);
    const [editingCommentText, setEditingCommentText] = useState<string | null>(null);
    const [editingCommentIsPublic, setEditingCommentIsPublic] = useState<boolean>(true);
    const [isPublicHighlight, setIsPublicHighlight] = useState(true);
    const [activeBookmarkId, setActiveBookmarkId] = useState<string | null>(null);
    const [showMyAnnotations, setShowMyAnnotations] = useState(true);

    const isReadOnly = !currentBook?.canAnnotate;
    const percentage = progress !== null ? Math.round((progress / totalSections) * 100) : 0;

    const pdfPages: number[] = [];
    if (currentBook?.format === 'pdf' && sectionContent.startsWith('{')) {
        try {
            const parsed = JSON.parse(sectionContent);
            for(let i = parsed.startPage; i <= parsed.endPage; i++) pdfPages.push(i);
        } catch(e) {}
    }

    // Fetch saved bookmark section index on mount
    useEffect(() => {
        if (!bookId) return;
        const initBookmark = async () => {
            if (!isAuthenticated) {
                setProgress(1);
                return;
            }
            try {
                const res = await fetch(`/api/books/${bookId}/bookmark`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setProgress(data.sectionIndex || 1);
                    if (data.highlightId) {
                        setScrollToHighlightId(data.highlightId);
                    }
                } else {
                    setProgress(1);
                }
            } catch (err) {
                setProgress(1);
            }
        };
        initBookmark();
    }, [bookId, isAuthenticated, token]);

    // Fetch collaborators progress
    useEffect(() => {
        if (!bookId || !isAuthenticated || progress === null) return;
        const fetchCollaborators = async () => {
            try {
                const res = await fetch(`/api/books/${bookId}/collaborators`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setCollaborators(data);
                }
            } catch (err) {
                console.error('Error fetching collaborators', err);
            }
        };
        fetchCollaborators();

        // Obtener comentarios recientes de amigos
        const fetchFriendsComments = async () => {
            try {
                const res = await fetch(`/api/books/${bookId}/friends-comments`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setFriendsComments(data);
                }
            } catch (err) {
                console.error('Error fetching friends comments', err);
            }
        };
        fetchFriendsComments();
    }, [bookId, progress, token, isAuthenticated]);

    useEffect(() => {
        if (!bookId || progress === null) return;

        const fetchSection = async () => {
            setLoading(true);
            try {
                const headers: any = {};
                if (token) headers['Authorization'] = `Bearer ${token}`;

                const res = await fetch(`/api/books/${bookId}/sections/${progress}`, {
                    headers
                });
                if (res.ok) {
                    const data = await res.json();
                    setSectionId(data.id);
                    setSectionContent(data.content);
                    setTotalSections(data.totalSections);
                    setCurrentBook(data.book);
                    setSavedHighlights(data.highlights || []);
                    setSelectedHighlight(null);
                    setSelectionMenu(null);
                    setCommentMode(false);

                } else {
                    if (res.status === 404 || res.status === 403 || res.status === 500) {
                        setLoading(false);
                        setSectionContent('Contenido no disponible.');
                        await alert({ title: 'Contenido no disponible', message: 'Es posible que este archivo haya cambiado su privacidad o haya sido eliminado.', type: 'warning' });
                        navigate('/catalog');
                        return;
                    }
                    setSectionContent('No se pudo cargar esta sección. Es posible que hayas llegado al final.');
                }
            } catch (err) {
                console.error('Error fetching section', err);
                setSectionContent('Error de red al cargar el contenido.');
            } finally {
                setLoading(false);
            }
        };

        fetchSection();

        // Socket logic for collaboration
        socket.emit('join_book', { bookId, userId: isAuthenticated && user ? user.username : 'guest' });

        return () => {
            socket.emit('leave_book', { bookId, userId: isAuthenticated && user ? user.username : 'guest' });
        };
    }, [bookId, progress, token, isAuthenticated]);

    useEffect(() => {
        const handleHighlightDeleted = (data: any) => {
            if (data.highlightId) {
                setSavedHighlights(prev => prev.filter(h => h.id !== data.highlightId));
                setFriendsComments(prev => prev.filter(c => c.highlightId !== data.highlightId));
                setAllAnnotations(prev => prev.filter(a => a.id !== data.highlightId));
            }
        };

        socket.on('highlight_deleted_broadcast', handleHighlightDeleted);

        return () => {
            socket.off('highlight_deleted_broadcast', handleHighlightDeleted);
        };
    }, []);

    const handleUpdateComment = async (highlightId: string, newContent: string, isPublic?: boolean) => {
        try {
            const bodyPayload: any = { content: newContent };
            if (isPublic !== undefined) bodyPayload.isPublic = isPublic;

            const res = await fetch(`/api/books/${bookId}/highlights/${highlightId}/comment`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(bodyPayload)
            });
            if (res.ok) {
                const isEmpty = newContent.trim() === '';
                
                setSavedHighlights(prev => prev.map(h => {
                    if (h.id === highlightId) {
                        const updatedH = { ...h };
                        if (isPublic !== undefined) updatedH.isPublic = isPublic;
                        if (isEmpty) {
                            updatedH.comments = [];
                        } else {
                            updatedH.comments = [{ content: newContent, username: user?.username || 'Usuario', userId: user?.id }];
                        }
                        return updatedH;
                    }
                    return h;
                }));
                
                if (isEmpty) {
                    setFriendsComments(prev => prev.filter(fc => fc.highlightId !== highlightId));
                } else {
                    setFriendsComments(prev => prev.map(fc => fc.highlightId === highlightId ? { ...fc, content: newContent } : fc));
                }
                setViewingComment(null);
                setEditingCommentText(null);
            } else {
                await alert({ title: 'Error', message: 'No se pudo actualizar el comentario.', type: 'error' });
            }
        } catch (error) {
            console.error('Error updating comment', error);
        }
    };

    const handleDeleteHighlightObj = async (highlightId: string) => {
        const isConfirmed = await confirm({ title: 'Eliminar anotación', message: '¿Estás seguro de que deseas eliminar esta anotación y sus comentarios?', type: 'warning' });
        if (!isConfirmed) return;
        
        try {
            const res = await fetch(`/api/books/${bookId}/highlights/${highlightId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setSavedHighlights(prev => prev.filter(h => h.id !== highlightId));
                setFriendsComments(prev => prev.filter(c => c.highlightId !== highlightId));
                setAllAnnotations(prev => prev.filter(a => a.id !== highlightId));
                setViewingComment(null);
                socket.emit('highlight_deleted', { bookId, highlightId });
            } else {
                await alert({ title: 'Error', message: 'No se pudo eliminar el resaltado. ¿Seguro que es tuyo?', type: 'error' });
            }
        } catch (error) {
            console.error('Error deleting highlight', error);
        }
    };

    const fetchAllAnnotations = async () => {
        if (!isAuthenticated) return;
        try {
            const res = await fetch(`/api/books/${bookId}/annotations`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAllAnnotations(data);
            }
        } catch (err) {
            console.error('Error fetching all annotations', err);
        }
    };

    useEffect(() => {
        if (!loading && (sectionContent || currentBook?.format === 'pdf')) {
            const attemptScroll = () => {
                let foundAndScrolled = false;
                const scrollBehavior = 'smooth'; // Smooth for all devices (bajado lento)

                if (currentBook?.format === 'pdf') {
                    if (scrollToHighlightId) {
                        const hl = savedHighlights.find(h => h.id === scrollToHighlightId);
                        if (hl && hl.startIndex) {
                            const pageElement = document.getElementById(`pdf-page-${hl.startIndex}`);
                            if (pageElement) {
                                pageElement.scrollIntoView({ behavior: scrollBehavior, block: 'start' });
                                foundAndScrolled = true;
                            }
                        }
                        if (foundAndScrolled || !hl) setScrollToHighlightId(null);
                        lastScrolledSectionProgress.current = progress;
                    } else if (lastScrolledSectionProgress.current !== progress && progress) {
                        const pageElement = document.getElementById(`pdf-page-${progress}`);
                        if (pageElement) {
                            pageElement.scrollIntoView({ behavior: scrollBehavior, block: 'start' });
                            foundAndScrolled = true;
                        }
                        if (foundAndScrolled) lastScrolledSectionProgress.current = progress;
                    }
                } else {
                    if (scrollToHighlightId) {
                        const element = document.querySelector(`mark[data-id="${scrollToHighlightId}"]`) || 
                                        document.querySelector(`span[data-hl-id="${scrollToHighlightId}"]`);
                        if (element) {
                            element.scrollIntoView({ behavior: scrollBehavior, block: 'center' });
                            // Highlight effect
                            const isMark = element.tagName.toLowerCase() === 'mark';
                            if (isMark) {
                                (element as HTMLElement).style.transition = 'box-shadow 0.3s ease';
                                (element as HTMLElement).style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.4)';
                                setTimeout(() => {
                                    (element as HTMLElement).style.boxShadow = 'none';
                                }, 2000);
                            } else {
                                element.classList.add('ring-4', 'ring-indigo-400', 'scale-125');
                                setTimeout(() => {
                                    element.classList.remove('ring-4', 'ring-indigo-400', 'scale-125');
                                }, 2000);
                            }
                            setScrollToHighlightId(null);
                            lastScrolledSectionProgress.current = progress;
                            foundAndScrolled = true;
                        }
                    } else if (lastScrolledSectionProgress.current !== progress) {
                        // Solo si no hubo redirección de comentario y no hemos scrolleado en esta sección aún
                        const mark = document.querySelector('mark[data-type="bookmark"]');
                        if (mark) {
                            mark.scrollIntoView({ behavior: scrollBehavior, block: 'center' });
                            foundAndScrolled = true;
                        }
                        lastScrolledSectionProgress.current = progress;
                    }
                }
                return foundAndScrolled;
            };

            const timer1 = setTimeout(() => {
                const scrolled = attemptScroll();
                if (!scrolled) {
                    // Retry after another 1000ms for slow rendering devices
                    setTimeout(attemptScroll, 1000);
                }
            }, 800); // 800ms initial delay for DOM painting

            return () => clearTimeout(timer1);
        }
    }, [scrollToHighlightId, loading, sectionContent, savedHighlights, progress, currentBook]);

    const handleTextSelection = () => {
        if (!isAuthenticated) return;
        if (!currentBook?.canAnnotate) return;
        setTimeout(() => {
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                const text = selection.toString().trim();
                if (text.length > 0) {
                    const range = selection.getRangeAt(0);
                    let rect = range.getBoundingClientRect();
                    // iOS Safari fallback for Range bounding rect
                    if (rect.width === 0 || (rect.top === 0 && rect.left === 0)) {
                        const clientRects = range.getClientRects();
                        if (clientRects.length > 0) {
                            rect = clientRects[0];
                        }
                    }
                    
                    let targetRect = rect;
                    if (window.innerWidth < 768) {
                        const clientRects = range.getClientRects();
                        if (clientRects.length > 0) {
                            targetRect = clientRects[clientRects.length - 1];
                        }
                    }

                    let menuY = targetRect.top - 10;
                    let menuX = targetRect.left + targetRect.width / 2;

                    const container = document.getElementById('reader-container');
                    if (container) {
                        const containerRect = container.getBoundingClientRect();
                        menuX = menuX - containerRect.left;
                        menuY = targetRect.top - containerRect.top - 10;
                    } else {
                        menuY = Math.max(menuY, 80);
                    }
                    
                    if (currentBook?.format === 'pdf') {
                        // Logic for PDF Text Selection
                        let node = range.startContainer as Node | null;
                        let pageElement: HTMLElement | null = null;
                        while (node && node !== document.body) {
                            if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).classList?.contains('react-pdf__Page')) {
                                pageElement = node as HTMLElement;
                                break;
                            }
                            node = node.parentNode;
                        }
                        
                        // Fallback if not found via parent traversal (sometimes happens on iOS shadow DOM/text layers)
                        if (!pageElement) {
                            const pages = document.querySelectorAll('.react-pdf__Page');
                            if (pages.length === 1) pageElement = pages[0] as HTMLElement;
                            else if (pages.length > 1) {
                                // Find the page intersecting with the selection rect
                                pageElement = Array.from(pages).find(p => {
                                    const pRect = p.getBoundingClientRect();
                                    return rect.top >= pRect.top && rect.top <= pRect.bottom;
                                }) as HTMLElement || pages[0] as HTMLElement;
                            }
                        }
                        
                        if (pageElement) {
                            const pageNumber = parseInt(pageElement.getAttribute('data-page-number') || '1', 10);
                            const pageRect = pageElement.getBoundingClientRect();
                            const clientRects = range.getClientRects();
                            
                            const rectangles = Array.from(clientRects).map(r => ({
                                top: ((r.top - pageRect.top) / pageRect.height) * 100,
                                left: ((r.left - pageRect.left) / pageRect.width) * 100,
                                width: (r.width / pageRect.width) * 100,
                                height: (r.height / pageRect.height) * 100
                            }));
                            
                            setSelectedHighlight({ text, startIndex: pageNumber, endIndex: pageNumber, rectangles });
                            setSelectionMenu({
                                show: true,
                                x: menuX,
                                y: menuY
                            });
                        }
                    } else {
                        // Logic for EPUB/TXT
                        const container = document.getElementById('reading-content');
                        if (container) {
                            const preSelectionRange = range.cloneRange();
                            preSelectionRange.selectNodeContents(container);
                            preSelectionRange.setEnd(range.startContainer, range.startOffset);
                            const startIndex = preSelectionRange.toString().length;
                            const endIndex = startIndex + text.length;
                            setSelectedHighlight({ text, startIndex, endIndex });
                            
                            setSelectionMenu({
                                show: true,
                                x: menuX,
                                y: menuY
                            });
                        }
                    }
                } else {
                    // Si ya estaba en comment mode, lo cerramos
                    if (selectionMenu && !commentMode) {
                        setSelectionMenu(null);
                        setSelectedHighlight(null);
                    }
                }
            } else {
                setSelectionMenu(null);
                setSelectedHighlight(null);
                setCommentMode(false);
            }
        }, 10);
    };

    useEffect(() => {
        // Global selection listener (crucial for mobile where touch events might not fire on container)
        let timeoutId: NodeJS.Timeout;
        const onSelectionChange = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                // Ignore if we are typing a comment
                if (!commentMode && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
                    handleTextSelection();
                }
            }, 600); // Wait for native selection UI to settle
        };

        document.addEventListener('selectionchange', onSelectionChange);
        return () => {
            document.removeEventListener('selectionchange', onSelectionChange);
            clearTimeout(timeoutId);
        };
    });

    const handleSaveHighlight = async (type: string = 'annotation', style: string = 'pastel', comment?: string, color?: string, pageNumber?: number) => {
        if (!isAuthenticated || !sectionId) return;
        
        let highlightPayload;
        if (currentBook?.format === 'pdf' && pageNumber !== undefined) {
            highlightPayload = {
                text: `Página ${pageNumber}`,
                startIndex: pageNumber,
                endIndex: pageNumber,
                type: type === 'annotation' ? 'page_comment' : type,
                style,
                commentText: comment,
                color: color || '#fef08a',
                isPublic: type === 'bookmark' ? false : isPublicHighlight
            };
        } else {
            if (type === 'bookmark') {
                highlightPayload = {
                    text: selectedHighlight ? selectedHighlight.text : 'Aquí me quedé',
                    startIndex: selectedHighlight ? selectedHighlight.startIndex : 0,
                    endIndex: selectedHighlight ? selectedHighlight.endIndex : 0,
                    type,
                    style,
                    commentText: comment,
                    color: color,
                    isPublic: false
                };
            } else {
                if (!selectedHighlight) return;
                highlightPayload = {
                    ...selectedHighlight,
                    type,
                    style,
                    commentText: comment,
                    color: color,
                    rectangles: selectedHighlight.rectangles,
                    isPublic: isPublicHighlight
                };
            }
        }

        try {
            const res = await fetch(`/api/books/${bookId}/sections/${sectionId}/highlights`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(highlightPayload)
            });

            if (res.ok) {
                // Fetch the section again to get the updated highlights and users
                const fetchRes = await fetch(`/api/books/${bookId}/sections/${progress}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (fetchRes.ok) {
                    const data = await fetchRes.json();
                    setSavedHighlights(data.highlights || []);
                    
                    // Also refresh collaborators if it was a bookmark
                    if (type === 'bookmark') {
                        const collabRes = await fetch(`/api/books/${bookId}/collaborators`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (collabRes.ok) {
                            setCollaborators(await collabRes.json());
                        }
                    }
                }
                
                setSelectedHighlight(null);
                setSelectionMenu(null);
                setCommentMode(false);
                setCommentText('');
                setPdfCommentMode(null);
                setPdfCommentText('');
                window.getSelection()?.removeAllRanges(); // Clear selection
            } else {
                await alert({ title: 'Error', message: 'No se pudo guardar la marca.', type: 'error' });
            }
        } catch (error) {
            console.error('Error saving highlight', error);
        }
    };

    const handleContentClick = async (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const commentIcon = target.closest('.comment-icon');
        const markElement = target.closest('mark');

        if (commentIcon) {
            const commentDataStr = commentIcon.getAttribute('data-comment');
            const highlightId = commentIcon.getAttribute('data-hl-id');
            if (commentDataStr && highlightId) {
                try {
                    const commentData = JSON.parse(commentDataStr);
                    setViewingComment({ ...commentData, highlightId });
                } catch (err) {
                    console.error("Error parsing comment data");
                }
            }
        } else if (markElement) {
            const highlightType = markElement.getAttribute('data-type');
            if (highlightType === 'bookmark') {
                const hlId = markElement.getAttribute('data-id');
                setActiveBookmarkId(hlId === activeBookmarkId ? null : (hlId || null));
                return; // Do not allow deleting bookmarks via click
            }

            const highlightId = markElement.getAttribute('data-id');
            if (highlightId) {
                const hl = savedHighlights.find(h => h.id === highlightId);
                if (hl) {
                    if (hl.comments && hl.comments.length > 0) {
                        // Open comment modal
                        setViewingComment({ ...hl.comments[0], highlightId: hl.id });
                    } else {
                        // Si no hay comentario, abrir el modal de todas formas para dar opción de eliminar o ver de quién es
                        setViewingComment({
                            userId: hl.userId,
                            username: hl.user ? hl.user.username : 'Usuario',
                            content: (user && (hl.userId === user.id || (hl.user && hl.user.username === user.username)))
                                ? 'Has marcado este texto.'
                                : `Este texto fue marcado por ${hl.user ? hl.user.username : 'alguien'}.`,
                            highlightId: hl.id || '',
                            isJustHighlight: true
                        });
                    }
                }
            }
        } else {
            // Clic en otro lado para ocultar menús y nombres
            setActiveBookmarkId(null);
            if (!target.closest('.floating-menu') && selectionMenu && !commentMode) {
                setSelectionMenu(null);
                setSelectedHighlight(null);
            }
        }
    };

    const renderContent = () => {
        if (!sectionContent) return { __html: '' };
        
        if (savedHighlights.length > 0) {
            let html = sectionContent.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            
            // Sort highlights descending so modifying html doesn't affect previous indices
            const sortedHighlights = [...savedHighlights].sort((a, b) => b.startIndex - a.startIndex);
            let lastProcessedStart = Infinity;
            
            for (const hl of sortedHighlights) {
                const isOwner = Boolean(user && hl.user && hl.user.username === user.username);
                
                // Permitir visualizar los marcadores de "Aquí me quedé" de todos los amigos (opcionalmente podríamos ocultarlos)
                // En modo enfoque, ocultar anotaciones de otros usuarios
                if (focusMode && !isOwner && hl.type !== 'bookmark') {
                    continue;
                }
                
                // Si está apagado el botón de "mis anotaciones", ocultar las propias
                if (!showMyAnnotations && isOwner && hl.type !== 'bookmark') {
                    continue;
                }

                if (hl.endIndex > lastProcessedStart) {
                    continue; // Skip overlapping highlights to prevent breaking HTML tags
                }
                lastProcessedStart = hl.startIndex;
                const colorObj = hl.user ? getUserColor(hl.user.id) : HIGHLIGHT_COLORS[0];
                const userName = hl.user ? hl.user.username : 'Alguien';
                
                const before = html.substring(0, hl.startIndex);
                const marked = html.substring(hl.startIndex, hl.endIndex);
                const after = html.substring(hl.endIndex);
                
                const isBookmark = hl.type === 'bookmark';
                
                let styleClass = '';
                let customStyleAttr = '';
                let displayMarked = marked;
                
                if (isBookmark) {
                    styleClass = `bg-primary text-white rounded shadow mx-0.5 fw-bold d-inline-flex flex-row align-items-stretch position-relative cursor-pointer overflow-visible align-middle`;
                    customStyleAttr = `gap: 0; border: 1px solid rgba(255,255,255,0.5); vertical-align: middle;`;
                    const showLabel = activeBookmarkId === hl.id;
                    const labelHtml = showLabel 
                        ? `<span class="pdf-bookmark-label text-[10px] font-bold text-slate-700 dark:text-slate-300 bg-white/90 dark:bg-slate-800/90 backdrop-blur px-2 py-0.5 rounded shadow-sm border border-slate-200 dark:border-slate-700 whitespace-nowrap position-absolute" style="top: 100%; left: 50%; transform: translateX(-50%); margin-top: 4px; z-index: 50;">${userName}</span>` 
                        : '';
                    // Diseño tipo píldora horizontal: listón a la izquierda, texto a la derecha (si hay texto)
                    const textHtml = marked.length > 0 ? `<span class="px-2 d-flex align-items-center" style="font-size: 0.85rem;">${marked}</span>` : '';
                    displayMarked = `
                        <div class="d-flex flex-column align-items-center justify-content-center bg-dark bg-opacity-25 px-2" style="min-height: 2.5rem; gap: 6px; ${marked.length === 0 ? 'border-radius: 0.25rem;' : 'border-top-left-radius: 0.25rem; border-bottom-left-radius: 0.25rem;'}">
                            <span style="font-size: 0.7rem; line-height: 1;">${userName.charAt(0).toUpperCase()}</span>
                            <i class="pi pi-bookmark pointer-events-none" style="font-size: 0.8rem;"></i>
                        </div>
                        ${textHtml}
                        ${labelHtml}
                    `;
                } else if (hl.style === 'pastel') {
                    styleClass = `rounded px-1 text-dark`;
                    customStyleAttr = hl.color ? `background-color: ${hl.color};` : `background-color: ${colorObj.bg ? '#fef08a' : '#fef08a'};`;
                } else if (hl.style === 'underline') {
                    styleClass = `underline decoration-[2px] underline-offset-4 bg-transparent px-1`;
                    customStyleAttr = hl.color ? `text-decoration-color: ${hl.color};` : `text-decoration-color: ${colorObj.border ? '#eab308' : '#eab308'};`;
                } else if (hl.style === 'strikethrough') {
                    styleClass = `line-through text-secondary bg-transparent px-1`;
                } else {
                    styleClass = `${colorObj.bg} rounded px-1`;
                }
                
                const commentHtml = hl.comments && hl.comments.length > 0
                    ? `<span class="comment-icon cursor-pointer mx-1 small d-inline-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary rounded-pill w-5 h-5 shadow-sm  transition-transform select-none" data-hl-id="${hl.id}" data-comment='${JSON.stringify(hl.comments[0]).replace(/'/g, "&#39;")}'>💬</span>`
                    : '';

                const hasComment = hl.comments && hl.comments.length > 0;

                const titleText = isBookmark 
                    ? userName + ' se quedó aquí' 
                    : (hasComment ? userName + ' (clic para ver comentario)' : (isOwner ? userName + ' (clic para eliminar)' : `Resaltado por ${userName}`));

                const clickableClass = !isBookmark ? 'cursor-pointer  transition-opacity' : '';

                html = `${before}<mark data-id="${hl.id}" data-type="${hl.type}" class="${styleClass} ${clickableClass}" style="${customStyleAttr}" title="${titleText}">${displayMarked}</mark>${commentHtml}${after}`;
            }
            
            return { __html: html };
        }

        return { __html: sectionContent.replace(/</g, "&lt;").replace(/>/g, "&gt;") };
    };

    return (
        <div className="d-flex w-100 bg-light font-sans overflow-hidden position-relative transition-colors" style={{ height: 'calc(100vh - 64px)' }}>
            {focusMode && (
                <style>{`
                    #reading-content mark { background: transparent !important; color: inherit !important; text-decoration: none !important; pointer-events: none; }
                    #reading-content .comment-icon { display: none !important; }
                `}</style>
            )}
             {/* Modal para ver comentario */}
            {viewingComment && (
                <div className="position-fixed top-0 bottom-0 start-0 end-0 bg-dark bg-opacity-50 d-flex align-items-center justify-content-center p-4" style={{ zIndex: 1050 }} onClick={() => { setViewingComment(null); setEditingCommentText(null); }}>
                    <div className="bg-white rounded-4 shadow-lg max-w-sm w-100 p-4 transition-colors d-flex flex-column max-h-85vh" onClick={e => e.stopPropagation()}>
                        <div className="d-flex align-items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-pill bg-primary bg-opacity-10 d-flex align-items-center justify-content-center text-primary fw-bold fs-5">
                                {viewingComment.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h4 className="fw-bold text-dark transition-colors">{viewingComment.username}</h4>
                                <span className="small text-secondary transition-colors">Comentario oculto</span>
                            </div>
                        </div>
                        
                        <div className="overflow-y-auto hide-scrollbar mb-5 pe-1">
                            {editingCommentText !== null ? (
                                <textarea 
                                    className="w-100 bg-light p-4 rounded-4 border border-primary border-opacity-50 text-dark min-h-120px resize-y"
                                    value={editingCommentText}
                                    onChange={e => setEditingCommentText(e.target.value)}
                                    autoFocus
                                />
                            ) : (
                                <p className="text-dark fst-italic bg-light p-4 rounded-4 border border-secondary border-opacity-25 transition-colors text-wrap text-break">{viewingComment.content}</p>
                            )}
                        </div>
                        
                        <div className="d-flex flex-column gap-2 mt-auto">
                            {editingCommentText !== null ? (
                                <>
                                    <div className={`form-check form-switch d-flex align-items-center justify-content-between mb-3 p-3 gap-2 rounded-3 border transition-colors ${editingCommentIsPublic ? 'border-primary bg-primary bg-opacity-10' : 'border-secondary border-opacity-25 bg-light'}`}>
                                        <label className="form-check-label small fw-bold text-dark cursor-pointer d-flex flex-column ms-1" htmlFor="editVisibilitySwitch">
                                            <span className="d-flex align-items-center gap-2">
                                                {editingCommentIsPublic ? <i className="pi pi-globe text-primary"></i> : <i className="pi pi-lock text-secondary"></i>}
                                                <span className={editingCommentIsPublic ? 'text-primary' : 'text-secondary'}>
                                                    {editingCommentIsPublic ? 'Anotación Pública' : 'Anotación Privada'}
                                                </span>
                                            </span>
                                            <span className="text-secondary text-[10px] fw-normal opacity-75 mt-1">
                                                {editingCommentIsPublic ? 'Otros lectores podrán ver esto.' : 'Solo tú puedes ver esta anotación.'}
                                            </span>
                                        </label>
                                        <input 
                                            className="form-check-input m-0 cursor-pointer shadow-sm" 
                                            style={{ float: 'none', width: '2.5em', height: '1.25em' }}
                                            type="checkbox" 
                                            role="switch" 
                                            id="editVisibilitySwitch"
                                            checked={editingCommentIsPublic}
                                            onChange={(e) => setEditingCommentIsPublic(e.target.checked)}
                                        />
                                    </div>
                                    <div className="d-flex gap-2">
                                        <button 
                                            onClick={() => handleUpdateComment(viewingComment.highlightId, editingCommentText, editingCommentIsPublic)}
                                            className="flex-grow-1 py-2.5 bg-primary text-white rounded-4 fw-bold transition-colors shadow-sm"
                                        >
                                            Guardar
                                        </button>
                                        <button 
                                            onClick={() => setEditingCommentText(null)}
                                            className="flex-grow-1 py-2.5 bg-light text-secondary border border-secondary border-opacity-25 rounded-4 fw-bold transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {user && (viewingComment.username === user.username || viewingComment.userId === user.id) && (
                                        <div className="d-flex gap-2 mb-1">
                                            {!viewingComment.isJustHighlight && (
                                                <button 
                                                    onClick={() => {
                                                        setEditingCommentText(viewingComment.content);
                                                        const hl = savedHighlights.find(h => h.id === viewingComment.highlightId);
                                                        setEditingCommentIsPublic(hl ? hl.isPublic : true);
                                                    }}
                                                    className="flex-grow-1 py-2 bg-primary bg-opacity-10 text-primary text-opacity-75 rounded-4 fw-bold transition-colors small"
                                                >
                                                    <i className="pi pi-pencil w-4 h-4 me-1 inline"></i> Editar
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => handleDeleteHighlightObj(viewingComment.highlightId)}
                                                className="flex-grow-1 py-2 bg-danger bg-opacity-10 text-danger text-opacity-75 rounded-4 fw-bold transition-colors small"
                                            >
                                                <i className="pi pi-trash w-4 h-4 me-1 inline"></i> Eliminar
                                            </button>
                                        </div>
                                    )}
                                    <button 
                                        onClick={() => { setViewingComment(null); setEditingCommentText(null); }}
                                        className="w-100 py-2.5 bg-light text-secondary border border-secondary border-opacity-25 rounded-4 fw-bold transition-colors mt-2"
                                    >
                                        Cerrar
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal para Todas las Anotaciones */}
            {showAnnotationsModal && (
                <div className="position-fixed top-0 bottom-0 start-0 end-0 bg-dark bg-opacity-50 d-flex align-items-center justify-content-center p-4" style={{ zIndex: 1050 }} onClick={() => setShowAnnotationsModal(false)}>
                    <div className="rounded-4 shadow-lg w-100 max-w-3xl d-flex flex-column transition-colors mt-5 mt-md-0" style={{ maxHeight: '85vh', backgroundColor: 'var(--surface-card)', color: 'var(--text-color)' }} onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-secondary border-opacity-25 d-flex justify-content-between align-items-center">
                            <h2 className="fs-4 fw-bold m-0">Todas las Anotaciones</h2>
                            <button onClick={() => setShowAnnotationsModal(false)} className="d-flex align-items-center justify-content-center rounded-circle hover:bg-secondary hover:bg-opacity-10 transition-colors" style={{ width: '36px', height: '36px', border: 'none', background: 'transparent' }}>
                                <i className="pi pi-times" style={{ fontSize: '1.2rem', color: 'var(--text-color-secondary)' }}></i>
                            </button>
                        </div>
                        
                        <div className="p-4 border-b border-secondary border-opacity-25 d-flex flex-wrap gap-4" style={{ backgroundColor: 'var(--surface-ground)' }}>
                            <div className="d-flex flex-column gap-1">
                                <label className="small fw-bold" style={{ color: 'var(--text-color-secondary)' }}>Tipo</label>
                                <select 
                                    className="small border border-secondary border-opacity-25 rounded px-3 py-1.5 outline-none"
                                    style={{ backgroundColor: 'var(--surface-card)', color: 'var(--text-color)' }}
                                    value={filterType}
                                    onChange={e => setFilterType(e.target.value)}
                                >
                                    <option value="all">Todos</option>
                                    <option value="highlight">Resaltado</option>
                                    <option value="comment">Comentario</option>
                                    <option value="underline">Subrayado</option>
                                    <option value="strikethrough">Tachado</option>
                                </select>
                            </div>
                            <div className="d-flex flex-column gap-1">
                                <label className="small fw-bold" style={{ color: 'var(--text-color-secondary)' }}>Autor</label>
                                <select 
                                    className="small border border-secondary border-opacity-25 rounded px-3 py-1.5 outline-none"
                                    style={{ backgroundColor: 'var(--surface-card)', color: 'var(--text-color)' }}
                                    value={filterAuthor}
                                    onChange={e => setFilterAuthor(e.target.value)}
                                >
                                    <option value="all">Todos</option>
                                    {Array.from(new Set(allAnnotations.map(a => a.user?.username))).filter(Boolean).map(username => (
                                        <option key={username as string} value={username as string}>{username as string}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="d-flex flex-column gap-1">
                                <label className="small fw-bold" style={{ color: 'var(--text-color-secondary)' }}>Fecha</label>
                                <select 
                                    className="small border border-secondary border-opacity-25 rounded px-3 py-1.5 outline-none"
                                    style={{ backgroundColor: 'var(--surface-card)', color: 'var(--text-color)' }}
                                    value={filterDateSort}
                                    onChange={e => setFilterDateSort(e.target.value)}
                                >
                                    <option value="desc">Más recientes primero</option>
                                    <option value="asc">Más antiguos primero</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex-grow-1 overflow-y-auto p-4 d-flex flex-column gap-4">
                            {allAnnotations
                                .filter(a => filterType === 'all' ? true : 
                                             (filterType === 'underline' ? a.style === 'underline' : 
                                              filterType === 'strikethrough' ? a.style === 'strikethrough' : 
                                              filterType === 'comment' ? (a.comments && a.comments.length > 0) :
                                              filterType === 'highlight' ? (!a.comments || a.comments.length === 0) && a.style !== 'underline' && a.style !== 'strikethrough' :
                                              true))
                                .filter(a => filterAuthor === 'all' ? true : a.user?.username === filterAuthor)
                                .sort((a, b) => {
                                    const dateA = new Date(a.createdAt).getTime();
                                    const dateB = new Date(b.createdAt).getTime();
                                    return filterDateSort === 'desc' ? dateB - dateA : dateA - dateB;
                                })
                                .map(anno => (
                                    <div 
                                        key={anno.id} 
                                        className="bg-light p-4 rounded-4 border border-secondary border-opacity-25 cursor-pointer transition-colors"
                                        onClick={() => {
                                            setProgress(anno.sectionIndex);
                                            setScrollToHighlightId(anno.id);
                                            setShowAnnotationsModal(false);
                                        }}
                                    >
                                        <div className="d-flex align-items-center gap-3 mb-2">
                                            <div className="w-8 h-8 rounded-pill bg-primary d-flex align-items-center justify-content-center text-primary fw-bold small">
                                                {anno.user?.username.charAt(0).toUpperCase() || '?'}
                                            </div>
                                            <div>
                                                <span className="small fw-bold text-dark">{anno.user?.username || 'Usuario'}</span>
                                                <div className="text-[10px] text-secondary">
                                                    Pág {anno.sectionIndex} • {new Date(anno.createdAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                            <div className={`ms-auto small fw-bold px-2 py-1 rounded ${ anno.comments && anno.comments.length > 0 ? 'bg-primary bg-opacity-10 text-primary ' : 'text-secondary bg-secondary bg-opacity-10 ' }`}>
                                                {anno.style === 'underline' ? 'Subrayado' : 
                                                 anno.style === 'strikethrough' ? 'Tachado' : 
                                                 (anno.comments && anno.comments.length > 0) ? 'Comentario' : 'Resaltado'}
                                            </div>
                                        </div>
                                        <div className="ps-11">
                                            <p className="small text-dark fst-italic bg-white p-2 rounded border-l-4 border-primary border-opacity-50">
                                                "{anno.text}"
                                            </p>
                                            {anno.comments && anno.comments.length > 0 && (
                                                <div className="mt-2 small text-dark d-flex align-items-start gap-2">
                                                    <i className="pi pi-comment w-4 h-4 text-primary mt-0.5"></i>
                                                    <span>{anno.comments[0].content}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {allAnnotations.length === 0 && (
                                    <p className="text-center text-secondary py-10">No hay anotaciones para mostrar.</p>
                                )}
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile Overlay for Sidebar */}
            {mobileSidebarOpen && !focusMode && (
                <div 
                    className="md:hidden absolute inset-0 bg-black/50 z-30" 
                    onClick={() => setMobileSidebarOpen(false)}
                ></div>
            )}
            
            {/* Herramientas Sociales / Sidebar */}
            <div
                className={`bg-white dark:bg-slate-900 shadow-sm transition-all duration-300 z-40 absolute top-0 bottom-0 left-0 md:relative flex flex-col shrink-0 overflow-hidden ${focusMode ? '!w-[0px] !opacity-0 border-none !-translate-x-full' : (mobileSidebarOpen ? '!w-72 !max-w-[75vw] !opacity-100 border-r border-slate-200 dark:border-slate-800 !translate-x-0 md:relative md:!translate-x-0' : '!w-[0px] !opacity-0 border-none !-translate-x-full md:!w-72 md:!max-w-xs md:!opacity-100 md:border-r md:border-slate-200 dark:md:border-slate-800 md:relative md:!translate-x-0')}`}
            >
                <div className="p-4 border-b border-secondary border-opacity-25 d-flex justify-content-between align-items-center bg-white bg-opacity-50 backdrop-blur transition-colors">
                    <h3 className="fw-bold text-dark tracking-tight transition-colors">Panel de Actividad</h3>
                </div>

                <div className="p-4 flex-grow-1 overflow-y-auto d-flex flex-column gap-4">
                    {!isAuthenticated ? (
                        <div className="bg-warning bg-opacity-10 p-4 rounded-4 border border-warning small text-warning text-darken shadow-sm transition-colors">
                            <p className="fw-bold mb-2">Modo de Lectura Pública</p>
                            <p className="opacity-90">Inicia sesión para guardar tu progreso, resaltar texto y unirte a la lectura colaborativa.</p>
                            <Link to="/login" className="mt-4 d-block text-center fw-bold text-white bg-warning px-4 py-2 rounded transition-colors">
                                Iniciar Sesión
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-4 border border-blue-100/50 transition-colors">
                                <h4 className="text-sm font-bold text-indigo-700 dark:text-indigo-400 transition-colors">Progreso General</h4>
                                <div className="w-full bg-indigo-100 dark:bg-slate-700 rounded-full h-2 mt-3 overflow-hidden transition-colors">
                                    <div
                                        className="bg-indigo-600 dark:bg-indigo-500 h-2 rounded-full transition-all duration-500 ease-out"
                                        style={{ width: `${percentage}%` }}
                                    ></div>
                                </div>
                                <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-2 font-medium transition-colors">Llevas el {percentage}% procesado</p>
                            </div>

                            <div className="bg-white p-4 rounded-4 border border shadow-sm transition-colors mt-4">
                                <h4 className="small fw-bold text-dark mb-3">Comentarios más recientes de amigos</h4>
                                {friendsComments.length === 0 ? (
                                    <p className="small text-secondary">No hay comentarios recientes.</p>
                                ) : (
                                    <div className="d-flex flex-column gap-3 max-h-60 overflow-y-auto hide-scrollbar pe-1">
                                        {(isMobile ? friendsComments.slice(0, 5) : friendsComments).map((fc: any) => (
                                            <div 
                                                key={fc.id} 
                                                className="bg-light p-3 rounded border border-secondary border-opacity-25 cursor-pointer transition-colors"
                                                onClick={() => {
                                                    if (currentBook?.format === 'pdf' && fc.pdfPage) {
                                                        const pageElement = document.getElementById(`pdf-page-${fc.pdfPage}`);
                                                        if (pageElement) pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                    } else {
                                                        setProgress(fc.sectionIndex);
                                                        setScrollToHighlightId(fc.highlightId);
                                                    }
                                                }}
                                            >
                                                <div className="d-flex align-items-center gap-2 mb-1">
                                                    <div className="w-5 h-5 rounded-pill bg-primary d-flex align-items-center justify-content-center text-primary fw-bold text-[10px]">
                                                        {fc.user.username.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="small fw-bold text-dark">{fc.user.username}</span>
                                                    <span className="text-[10px] text-secondary ms-auto whitespace-nowrap flex-shrink-0">Pág {fc.sectionIndex}</span>
                                                </div>
                                                <p className="small text-dark text-truncate fst-italic">"{fc.content}"</p>
                                            </div>
                                        ))}
                                        {isMobile && friendsComments.length > 5 && (
                                            <button 
                                                onClick={() => setShowAllFriendsCommentsModal(true)}
                                                className="w-100 mt-2 bg-white text-secondary fw-bold py-2 rounded-4 border border-secondary border-opacity-25 transition-colors shadow-sm small"
                                            >
                                                Ver {friendsComments.length - 5} comentarios más
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            <button 
                                onClick={() => { 
                                    fetchAllAnnotations(); 
                                    setShowAnnotationsModal(true); 
                                    if (window.innerWidth < 1024) setMobileSidebarOpen(false);
                                }}
                                className="w-100 mt-4 bg-primary text-white fw-bold py-2.5 rounded-4 transition-colors shadow-sm small d-flex align-items-center justify-content-center gap-2"
                            >
                                <i className="pi pi-eye w-4 h-4"></i> Todas las Anotaciones
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Main Reading Area container */}
            <div className="flex-grow-1 d-flex overflow-hidden position-relative bg-light transition-colors">
                
                {/* Scroll Progress Bar */}
                <div className="position-absolute top-0 start-0 end-0 h-1.5 z-3 bg-transparent">
                    <div className="h-100 bg-primary shadow-[0_0_10px_rgba(99,102,241,0.6)] transition-all duration-150 ease-out" style={{ width: `${scrollProgress}%` }}></div>
                </div>

                <div 
                    id="main-scroll-container"
                    onScroll={(e) => {
                        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
                        if (scrollHeight > clientHeight) {
                            setScrollProgress((scrollTop / (scrollHeight - clientHeight)) * 100);
                        } else {
                            setScrollProgress(100);
                        }
                    }}
                    className="flex-grow-1 overflow-y-auto position-relative scroll-smooth d-block pb-20"
                >
                    <div className={`w-full flex flex-col min-h-full relative transition-all duration-500 mx-auto ${currentBook?.format === 'pdf' ? 'px-3 md:px-5 py-4' : 'px-4 md:px-8 py-5 lg:px-24 xl:px-48'}`} style={{ maxWidth: currentBook?.format === 'pdf' ? '1200px' : '900px' }}>
                        {/* BOTÓN VOLVER AL CATÁLOGO */}
                        <div className="mb-3 d-flex justify-content-start">
                            <Link to="/catalog" className="d-inline-flex align-items-center gap-2 small fw-bold text-secondary transition-colors bg-white px-4 py-2 rounded-pill shadow-sm border border">
                                ← Volver al Catálogo
                            </Link>
                        </div>

                        {/* BOTÓN DUPLICAR (SOLO LECTURA PÚBLICA) */}
                        {isReadOnly && isAuthenticated && (
                            <div className="bg-amber-100 border border-warning p-4 rounded-4 mb-5 d-flex flex-column d-sm-flex-row justify-content-between align-items-center gap-4">
                                <div>
                                    <h3 className="fw-bold text-warning text-darken">Estás en modo de Solo Lectura</h3>
                                    <p className="small text-warning text-darken">Este libro es público. Para añadir anotaciones, debes duplicarlo a tu biblioteca.</p>
                                </div>
                                <button 
                                    onClick={async () => {
                                        try {
                                            const res = await fetch(`/api/books/${bookId}/duplicate`, {
                                                method: 'POST',
                                                headers: { 'Authorization': `Bearer ${token}` }
                                            });
                                            if (res.ok) {
                                                const data = await res.json();
                                                window.location.href = `/read/${data.newBookId}`;
                                            } else {
                                                await alert({ title: 'Error', message: 'Error al duplicar el libro', type: 'error' });
                                            }
                                        } catch (e) { console.error(e); }
                                    }}
                                    className="whitespace-nowrap bg-primary text-white small px-4 py-2 rounded fw-bold shadow-sm transition-colors d-flex align-items-center gap-2"
                                >
                                    <i className="pi pi-plus w-4 h-4"></i> Añadir a mi biblioteca
                                </button>
                            </div>
                        )}
                        
                        {/* HEADER DEL LIBRO */}
                        <div 
                            className="relative w-full overflow-hidden flex flex-col justify-end p-6 lg:p-10 shadow-2xl bg-slate-900 transition-all duration-500 mb-6 rounded-3xl book-cover-header"
                            style={{
                                ...(currentBook?.coverUrl ? { 
                                    backgroundImage: `url('${currentBook.coverUrl.startsWith('http') ? currentBook.coverUrl : (currentBook.coverUrl.startsWith('/') ? currentBook.coverUrl : `/${currentBook.coverUrl}`).replace(/\\/g, '/')}')`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center'
                                } : {})
                            }}
                        >
                            {/* Premium Glassmorphism Base */}
                            <div className="absolute inset-0 bg-black/40 backdrop-blur-md border border-white/10"></div>
                            
                            {/* Colorful Iridescent Glows */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/40 via-fuchsia-500/30 to-rose-500/20 mix-blend-overlay"></div>
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-transparent to-purple-500/30"></div>

                            {/* Dark Base for Text Readability */}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent"></div>

                            <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
                                <div>
                                    <h1 className="text-3xl sm:text-5xl font-black text-white mb-4 tracking-tight drop-shadow-2xl">{currentBook?.title || 'Cargando...'}</h1>
                                    <div className="flex items-center gap-4">
                                        <span className="px-5 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-sm font-bold text-white shadow-xl flex items-center gap-2">
                                            <i className="pi pi-star text-amber-400"></i>
                                            Sección {progress} / {totalSections}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                                    <button
                                        onClick={() => setProgress(p => Math.max(1, (p || 1) - 1))}
                                        className={`px-4 py-2 font-bold rounded-xl transition-colors text-sm ${progress && progress > 1 ? 'text-white bg-white/20 hover:bg-white/30' : 'text-white/30 bg-transparent cursor-not-allowed'}`}
                                        disabled={!progress || progress <= 1}
                                    >
                                        ← Anterior
                                    </button>
                                    <button
                                        onClick={() => setProgress(p => Math.min(totalSections, (p || 0) + 1))}
                                        className={`px-4 py-2 font-bold rounded-xl shadow-lg transition-all text-sm ${(progress || 0) < totalSections ? 'bg-white text-slate-900 hover:bg-slate-100' : 'bg-white/10 text-white/40 cursor-not-allowed'}`}
                                        disabled={!progress || progress >= totalSections}
                                    >
                                        Siguiente →
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* CONTENIDO DEL LIBRO */}
                        <div id="reader-container" className="bg-white px-4 sm py-4 md rounded-4 shadow-sm border border-secondary border-opacity-25 text-base md leading-relaxed text-dark antialiased selection/50 w-100 mb-10 position-relative transition-colors">
                            {loading ? (
                                <p className="text-center text-secondary animate-pulse">Cargando...</p>
                            ) : currentBook?.format === 'pdf' ? (
                                <div 
                                    className="d-flex flex-column align-items-center w-100" 
                                    onMouseUp={handleTextSelection}
                                    onTouchEnd={handleTextSelection}
                                    onKeyUp={handleTextSelection}
                                    onClick={handleContentClick}
                                >
                                    <Document file={`${currentBook.fileUrl}`} loading={<span className="text-secondary">Cargando PDF...</span>}>
                                        {pdfPages.map(page => (
                                            <div id={`pdf-page-${page}`} key={page} className="position-relative mb-5 rounded bg-white overflow-visible group" style={{ boxShadow: '0 10px 25px rgba(0,0,0,0.15)' }}>
                                                <Page pageNumber={page} renderTextLayer={true} renderAnnotationLayer={false} width={Math.min((window.innerWidth < 640 ? window.screen.width : window.innerWidth) - (window.innerWidth < 640 ? 90 : (window.innerWidth < 1024 ? 210 : (mobileSidebarOpen ? 520 : 250))), 1000)} />
                                                
                                                {/* ACCIONES DE PÁGINA */}
                                                {!isReadOnly && isAuthenticated && (
                                                    <div className="position-absolute top-4 -right-2 sm d-flex flex-column gap-1 sm opacity-30 group- transition-opacity z-10">
                                                        <button 
                                                            onClick={() => handleSaveHighlight('bookmark', 'pastel', undefined, undefined, page)} 
                                                            className="bg-white/90 p-1.5 sm rounded shadow-lg text-slate-800 dark:text-slate-200 dark:bg-slate-800/90 transition-colors border border-slate-200 dark:border-slate-700"
                                                            title="Aquí me quedé"
                                                        >
                                                            <i className="pi pi-bookmark "></i>
                                                        </button>
                                                        <button 
                                                            onClick={() => setPdfCommentMode(page)} 
                                                            className="bg-white/90 p-1.5 sm rounded shadow-lg text-slate-800 dark:text-slate-200 dark:bg-slate-800/90 transition-colors border border-slate-200 dark:border-slate-700"
                                                            title="Comentar"
                                                        >
                                                            <i className="pi pi-comment "></i>
                                                        </button>
                                                    </div>
                                                )}

                                                {/* MENÚ FLOTANTE PARA COMENTAR (PDF) */}
                                                {pdfCommentMode === page && (
                                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col gap-3 w-[22rem] md:w-[28rem] transition-all">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Añadir Comentario</h3>
                                                            <button onClick={() => { setPdfCommentMode(null); setPdfCommentText(''); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                                                                <i className="pi pi-times"></i>
                                                            </button>
                                                        </div>
                                                        
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                                            Puedes escribir un resumen de esta página, guardar una idea clave o dejar una duda para debatirla.
                                                        </p>
                                                        
                                                        <textarea 
                                                            autoFocus
                                                            placeholder="Escribe tu idea aquí..."
                                                            value={pdfCommentText}
                                                            onChange={e => setPdfCommentText(e.target.value)}
                                                            className="w-full bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-100 text-sm p-4 rounded-xl outline-none border border-slate-200 dark:border-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-500/30 transition-all resize-none h-32 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                                        />
                                                        
                                                        {!currentBook?.isCreator && currentBook?.canAnnotate && (
                                                            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-medium cursor-pointer mt-1">
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={isPublicHighlight} 
                                                                    onChange={e => setIsPublicHighlight(e.target.checked)}
                                                                    className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 dark:text-indigo-500 focus:ring-indigo-500 dark:focus:ring-indigo-500/50 dark:bg-slate-700 w-4 h-4 cursor-pointer"
                                                                />
                                                                Hacer este comentario público
                                                            </label>
                                                        )}
                                                        
                                                        <div className="flex gap-3 mt-2">
                                                            <button onClick={() => { setPdfCommentMode(null); setPdfCommentText(''); }} className="px-5 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-sm transition-colors">Cancelar</button>
                                                            <button 
                                                                onClick={() => handleSaveHighlight('page_comment', 'pastel', pdfCommentText, undefined, page)}
                                                                disabled={!pdfCommentText.trim()}
                                                                className={`flex-1 font-bold py-2.5 rounded-xl text-sm transition-all shadow-md ${pdfCommentText.trim() ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none'}`}
                                                            >
                                                                Guardar
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* MARCAS Y COMENTARIOS EN PÁGINA */}
                                                {(() => {
                                                    const pageHighlights = savedHighlights.filter(h => h.startIndex === page);
                                                    const pageBookmarks = pageHighlights.filter(h => h.type === 'bookmark');
                                                    return pageHighlights.map((h, i) => {
                                                    let isMyHl = false;
                                                    let colorClass = 'bg-primary';
                                                    let iconClass = 'pi-bookmark';
                                                    
                                                    if (h.user) {
                                                        isMyHl = h.user.id === user?.id;
                                                        if (!isMyHl) {
                                                            const hash = h.user.username.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
                                                            const colors = ['bg-rose-500', 'bg-pink-500', 'bg-fuchsia-500', 'bg-purple-500', 'bg-violet-500', 'bg-primary bg-opacity-10', 'bg-cyan-500', 'bg-teal-500', 'bg-emerald-500', 'bg-green-500', 'bg-orange-500'];
                                                            const icons = ['pi-bookmark', 'pi-star', 'pi-flag', 'pi-map-marker', 'pi-heart', 'pi-bullseye'];
                                                            colorClass = colors[hash % colors.length];
                                                            iconClass = icons[hash % icons.length];
                                                        }
                                                    }

                                                    const bmIndex = h.type === 'bookmark' ? pageBookmarks.findIndex(bm => bm.id === h.id) : 0;
                                                    
                                                    let shouldShow = true;
                                                    if (h.type !== 'bookmark') {
                                                        if (focusMode && !isMyHl) {
                                                            shouldShow = false;
                                                        }
                                                        if (!showMyAnnotations && isMyHl) {
                                                            shouldShow = false;
                                                        }
                                                    }

                                                    return (
                                                    <div key={h.id} className="absolute inset-0 w-full h-full z-10 pointer-events-none">
                                                        {/* Render BOOKMARK */}
                                                        {h.type === 'bookmark' && (
                                                            <div 
                                                                className="absolute -top-3 flex flex-col items-center gap-[6px] cursor-pointer transition-all group/mark z-20 pointer-events-auto hover:-translate-y-1 pdf-bookmark-container"
                                                                style={{ '--bm-index': bmIndex } as any}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setActiveBookmarkId(activeBookmarkId === h.id ? null : (h.id || null));
                                                                }}
                                                            >
                                                                <div className={`pdf-bookmark-ribbon w-8 h-auto min-h-[3rem] rounded-b-lg shadow-md flex flex-col items-center justify-end pb-2 pt-2 gap-[6px] border border-white/50 ${isMyHl ? 'bg-amber-400 text-amber-900' : 'bg-slate-700 text-white'}`} title={`Marcador de ${h.user?.username}`}>
                                                                    {h.user && <span className="font-bold text-xs leading-none">{h.user.username.charAt(0).toUpperCase()}</span>}
                                                                    <i className="pi pi-bookmark text-sm pointer-events-none"></i>
                                                                </div>
                                                                {h.user && activeBookmarkId === h.id && (
                                                                    <span className="pdf-bookmark-label text-[10px] font-bold text-slate-700 dark:text-slate-300 bg-white/90 dark:bg-slate-800/90 backdrop-blur px-2 py-0.5 rounded shadow-sm border border-slate-200 dark:border-slate-700 whitespace-nowrap position-absolute" style={{ top: '100%', marginTop: '4px', zIndex: 50 }}>
                                                                        {h.user.username}
                                                                    </span>
                                                                )}
                                                                {!isReadOnly && isAuthenticated && isMyHl && (
                                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteHighlightObj(h.id || '') }} className="opacity-0 group-hover/mark text-danger">
                                                                        <i className="pi pi-trash w-3.5 h-3.5"></i>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                        {/* Render RESALTADO DE TEXTO (PDF) */}
                                                        {shouldShow && h.rectangles && (
                                                            (() => {
                                                                try {
                                                                    const rects = typeof h.rectangles === 'string' ? JSON.parse(h.rectangles) : h.rectangles;
                                                                    const hasComment = h.comments && h.comments.length > 0;
                                                                    return rects.map((r: any, rIdx: number) => {
                                                                        const isLastRect = rIdx === rects.length - 1;
                                                                        let rectStyle: React.CSSProperties = {
                                                                            top: `${r.top}%`, left: `${r.left}%`, width: `${r.width}%`, height: `${r.height}%`,
                                                                            backgroundColor: hasComment ? 'transparent' : (h.color || '#fef08a'),
                                                                            mixBlendMode: hasComment ? 'normal' : ('multiply' as any),
                                                                            opacity: hasComment ? 1 : 0.6
                                                                        };

                                                                        if (hasComment) {
                                                                            rectStyle.borderBottom = `2.5px solid black`;
                                                                        }

                                                                        return (
                                                                        <div 
                                                                            key={`rect-${h.id}-${rIdx}`} 
                                                                            className={`absolute z-10 pointer-events-auto cursor-pointer transition-all ${hasComment ? 'hover:bg-slate-400/10' : 'hover:opacity-100'}`}
                                                                            style={rectStyle}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                if (h.comments && h.comments.length > 0) {
                                                                                    setViewingComment({ ...h.comments[0], highlightId: h.id });
                                                                                } else {
                                                                                    setViewingComment({
                                                                                        userId: h.userId,
                                                                                        username: h.user ? h.user.username : 'Usuario',
                                                                                        content: (user && (h.userId === user?.id || (h.user && h.user.username === user?.username)))
                                                                                            ? 'Has marcado este texto.'
                                                                                            : `Este texto fue marcado por ${h.user ? h.user.username : 'alguien'}.`,
                                                                                        highlightId: h.id || '',
                                                                                        isJustHighlight: true
                                                                                    });
                                                                                }
                                                                            }}
                                                                            title={`Resaltado por ${h.user?.username || 'Alguien'}`}
                                                                        >
                                                                            {hasComment && isLastRect && (
                                                                                <i className="pi pi-comment absolute drop-shadow-sm" style={{ right: '-12px', top: '-6px', fontSize: '12px', color: 'black' }}></i>
                                                                            )}
                                                                        </div>
                                                                    )});
                                                                } catch(e) { return null; }
                                                            })()
                                                        )}
                                                        {/* Render COMENTARIO DE PÁGINA (PDF) */}
                                                        {shouldShow && h.type === 'page_comment' && (
                                                            <div 
                                                                className="absolute -right-4 sm:-right-6 flex items-center gap-2 cursor-pointer transition-all group/mark z-10 flex-row-reverse pointer-events-auto hover:scale-105"
                                                                style={{ top: `${6 + i*3}rem` }}
                                                                onClick={() => setViewingComment({ username: h.user?.username || '', content: h.comments?.[0]?.content || h.text || '', highlightId: h.id || '' })}
                                                            >
                                                                <div className={`w-8 h-8 rounded-full shadow-md flex items-center justify-center border-2 border-white ${isMyHl ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-700'}`} title={`Comentario de ${h.user?.username}`}>
                                                                    <i className="pi pi-comment text-sm"></i>
                                                                </div>
                                                                {h.user && (
                                                                    <span className="hidden sm:block text-xs font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-1 rounded shadow-sm border border-slate-200 dark:border-slate-700">
                                                                        {h.user.username}
                                                                    </span>
                                                                )}
                                                                {!isReadOnly && isAuthenticated && isMyHl && (
                                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteHighlightObj(h.id || '') }} className="opacity-0 group-hover/mark text-rose-500 mr-2 transition-opacity">
                                                                        <i className="pi pi-trash w-4 h-4"></i>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )})})()}
                                            </div>
                                        ))}
                                    </Document>
                                </div>
                            ) : (
                                <div 
                                    id="reading-content"
                                    className={`prose prose-lg sm:prose-xl dark:prose-invert max-w-none w-100 ${isAuthenticated && !isReadOnly ? 'cursor-text' : 'cursor-default'}`}
                                    onMouseUp={handleTextSelection}
                                    onTouchEnd={handleTextSelection}
                                    onKeyUp={handleTextSelection}
                                    onClick={handleContentClick}
                                    dangerouslySetInnerHTML={renderContent()}
                                />
                            )}
                            
                            {/* MENU FLOTANTE DE SELECCIÓN */}
                            {selectionMenu && selectionMenu.show && isAuthenticated && !isReadOnly && (
                                <div 
                                    className="floating-menu position-absolute shadow-lg rounded-4 px-2 py-1.5 d-flex flex-column flex-md-row align-items-center gap-1 border border-secondary border-opacity-25"
                                    style={{ 
                                        left: selectionMenu.x, 
                                        top: selectionMenu.y, 
                                        zIndex: 9999,
                                        transform: window.innerWidth < 768 ? 'translate(-50%, -100%) scale(0.8)' : 'translate(-50%, -100%) scale(0.85)',
                                        transformOrigin: 'bottom center',
                                        width: 'max-content',
                                        backgroundColor: 'var(--surface-card)',
                                        color: 'var(--text-color)'
                                    }}
                                >
                                    {commentMode ? (
                                        <div className="d-flex flex-column gap-1">
                                            <div className="d-flex align-items-center gap-2 p-1">
                                                <input 
                                                    autoFocus
                                                    type="text" 
                                                    placeholder="Escribe un comentario oculto..." 
                                                    className="small px-3 py-1.5 rounded outline-none w-48 border border-secondary border-opacity-25 transition-colors"
                                                    style={{ backgroundColor: 'var(--surface-ground)', color: 'var(--text-color)' }}
                                                    value={commentText}
                                                    onChange={e => setCommentText(e.target.value)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter' && commentText.trim()) {
                                                            handleSaveHighlight('annotation', 'pastel', commentText);
                                                        }
                                                        if (e.key === 'Escape') setCommentMode(false);
                                                    }}
                                                />
                                                <button 
                                                    onClick={() => handleSaveHighlight('annotation', 'pastel', commentText)}
                                                    disabled={!commentText.trim()}
                                                    className="bg-primary disabled px-3 py-1.5 rounded fw-bold small transition-colors text-white"
                                                >
                                                    Guardar
                                                </button>
                                                <button 
                                                    onClick={() => setCommentMode(false)}
                                                    className="text-secondary px-2"
                                                >
                                                    <i className="pi pi-times w-5 h-5 inline"></i>
                                                </button>
                                            </div>
                                            {!currentBook?.isCreator && currentBook?.canAnnotate && (
                                                <div className="px-2 pb-1 border-top border-secondary border-opacity-25 mt-1 pt-1">
                                                    <label className="d-flex align-items-center gap-2 text-[10px] text-secondary fw-bold">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={isPublicHighlight} 
                                                            onChange={e => setIsPublicHighlight(e.target.checked)}
                                                            className="rounded border-secondary border-opacity-25 text-primary w-3 h-3"
                                                            style={{ backgroundColor: 'var(--surface-ground)' }}
                                                        />
                                                        Público
                                                    </label>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="d-flex flex-column flex-md-row align-items-center gap-1">
                                            {/* Primera Fila (Colores y Subrayar) */}
                                            <div className="d-flex align-items-center justify-content-center w-100">
                                                <div className="d-flex align-items-center gap-1.5 px-2">
                                                    <button onClick={() => handleSaveHighlight('annotation', 'pastel', undefined, '#fef08a')} className="w-5 h-5 rounded-pill transition-transform border border-secondary border-opacity-25" style={{ backgroundColor: '#fef08a' }} title="Amarillo"></button>
                                                    <button onClick={() => handleSaveHighlight('annotation', 'pastel', undefined, '#bbf7d0')} className="w-5 h-5 rounded-pill transition-transform border border-secondary border-opacity-25" style={{ backgroundColor: '#bbf7d0' }} title="Verde"></button>
                                                    <button onClick={() => handleSaveHighlight('annotation', 'pastel', undefined, '#bfdbfe')} className="w-5 h-5 rounded-pill transition-transform border border-secondary border-opacity-25" style={{ backgroundColor: '#bfdbfe' }} title="Azul"></button>
                                                    <button onClick={() => handleSaveHighlight('annotation', 'pastel', undefined, '#fbcfe8')} className="w-5 h-5 rounded-pill transition-transform border border-secondary border-opacity-25" style={{ backgroundColor: '#fbcfe8' }} title="Rosa"></button>
                                                    <button onClick={() => handleSaveHighlight('annotation', 'pastel', undefined, '#e9d5ff')} className="w-5 h-5 rounded-pill transition-transform border border-secondary border-opacity-25" style={{ backgroundColor: '#e9d5ff' }} title="Morado"></button>
                                                </div>
                                                <div className="w-px h-5 bg-secondary mx-1 opacity-25"></div>
                                                <button 
                                                    onClick={() => handleSaveHighlight('annotation', 'underline')}
                                                    className="px-3 py-1.5 rounded transition-colors small fw-medium underline decoration-[2px] decoration-green-400 underline-offset-4 hover:bg-secondary hover:bg-opacity-10"
                                                    title="Subrayar"
                                                >
                                                    Subrayar
                                                </button>
                                            </div>
                                            
                                            {/* Separador vertical en PC, horizontal en celular */}
                                            <div className="w-px h-5 bg-secondary mx-1 opacity-25 d-none d-md-block"></div>
                                            <div className="w-100 h-px bg-secondary opacity-25 d-block d-md-none my-1"></div>

                                            {/* Segunda Fila (Público y Comentar) */}
                                            <div className="d-flex align-items-center justify-content-center w-100">
                                                <button 
                                                    onClick={() => handleSaveHighlight('annotation', 'strikethrough')}
                                                    className="px-3 py-1.5 rounded transition-colors small fw-medium line-through hover:bg-secondary hover:bg-opacity-10 d-none d-md-block"
                                                    title="Tachar"
                                                >
                                                    Tachar
                                                </button>
                                                {!currentBook?.isCreator && currentBook?.canAnnotate && (
                                                    <>
                                                        <div className="w-px h-5 bg-secondary mx-1 opacity-25 d-none d-md-block"></div>
                                                        <label className="d-flex align-items-center gap-1.5 small fw-bold cursor-pointer px-2 hover:bg-secondary hover:bg-opacity-10 rounded py-1 transition-colors m-0">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={isPublicHighlight} 
                                                                onChange={e => setIsPublicHighlight(e.target.checked)}
                                                                className="rounded border-secondary border-opacity-25 text-primary w-3 h-3 cursor-pointer"
                                                                style={{ backgroundColor: 'var(--surface-ground)' }}
                                                            />
                                                            Público
                                                        </label>
                                                    </>
                                                )}
                                                <div className="w-px h-5 bg-secondary mx-1 opacity-25"></div>
                                                <button 
                                                    onClick={() => setCommentMode(true)}
                                                    className="px-3 py-1.5 rounded transition-colors small fw-bold d-flex align-items-center gap-1 hover:bg-secondary hover:bg-opacity-10"
                                                    style={{ color: 'var(--primary-color)' }}
                                                    title="Comentar"
                                                >
                                                    <span><i className="pi pi-comment w-4 h-4 me-1 inline"></i></span> Comentar
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    {/* Flechita del globo */}
                                    <div className="position-absolute left-1/2 bottom-0 translate-y-full transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-l-transparent border-r-transparent border-b-0 border-t-[8px] border-t-white"></div>
                                </div>
                            )}
                        </div>

                        {/* BOTONES INFERIORES */}
                        <div className="flex flex-row justify-between items-center mt-auto w-full pt-10 pb-24">
                            <button
                                onClick={() => setProgress(p => Math.max(1, (p || 1) - 1))}
                                className={`px-4 sm:px-6 py-2 sm:py-2.5 font-bold rounded-xl transition-colors text-sm sm:text-base w-auto text-center flex justify-center items-center ${progress && progress > 1 ? 'text-slate-800 dark:text-slate-200 bg-slate-200/60 dark:bg-slate-700/60 hover:bg-slate-300 dark:hover:bg-slate-600' : 'text-slate-400 dark:text-slate-600 bg-transparent cursor-not-allowed'}`}
                                disabled={!progress || progress <= 1}
                            >
                                ← Anterior
                            </button>
                            <span className="font-semibold text-slate-500 dark:text-slate-400 text-sm sm:text-base whitespace-nowrap px-2">Pág. {progress}/{totalSections}</span>
                            <button
                                onClick={() => setProgress(p => Math.min(totalSections, (p || 0) + 1))}
                                className={`px-4 sm:px-6 py-2 sm:py-2.5 font-bold rounded-xl shadow-md transition-all text-sm sm:text-base w-auto text-center flex justify-center items-center ${(progress || 0) < totalSections ? 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-lg' : 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'}`}
                                disabled={!progress || progress >= totalSections}
                            >
                                Siguiente →
                            </button>
                        </div>
                    </div>
                </div>

                {/* BOTONES FLOTANTES AL PIE DE PÁGINA */}
                {isAuthenticated && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex flex-row items-center justify-center gap-4 z-[50]">
                        {currentBook?.format !== 'pdf' && (
                            <button 
                                onClick={() => handleSaveHighlight('bookmark')}
                                className={`px-4 py-2 sm.5 rounded-pill fw-bold shadow-lg d-flex align-items-center justify-content-center gap-2 transition-all backdrop-blur-md whitespace-nowrap small sm max-w-100 bg-primary text-white hover-bg-primary-dark`}
                            >
                                <span className="small sm">📌</span> Marcar "Aquí me quedé"
                            </button>
                        )}
                        
                        <div className="d-none d-sm-flex gap-3">
                            <button
                                onClick={() => setFocusMode(!focusMode)}
                                className={`d-flex rounded-circle shadow-lg align-items-center justify-content-center transition-all bg-white text-dark border border flex-shrink-0 ${focusMode ? 'ring-2 ring-indigo-500 text-primary' : ''}`}
                                style={{ width: '3.5rem', height: '3.5rem' }}
                                title={focusMode ? "Desactivar Modo Enfoque" : "Activar Modo Enfoque"}
                            >
                                {focusMode ? <i className="pi pi-eye-slash" style={{ fontSize: '1.4rem' }}></i> : <i className="pi pi-eye" style={{ fontSize: '1.4rem' }}></i>}
                            </button>
                            <button
                                onClick={() => setShowMyAnnotations(!showMyAnnotations)}
                                className={`d-flex rounded-circle shadow-lg align-items-center justify-content-center transition-all bg-white text-dark border border flex-shrink-0 ${!showMyAnnotations ? 'ring-2 ring-rose-500 text-rose-500' : 'text-primary'}`}
                                style={{ width: '3.5rem', height: '3.5rem' }}
                                title={showMyAnnotations ? "Ocultar mis anotaciones" : "Mostrar mis anotaciones"}
                            >
                                {showMyAnnotations ? <i className="pi pi-user" style={{ fontSize: '1.4rem' }}></i> : <i className="pi pi-user-minus" style={{ fontSize: '1.4rem' }}></i>}
                            </button>
                        </div>
                    </div>
                )}

                {/* Timeline Progress */}
                {isAuthenticated && !focusMode && (
                    <>
                        {mobileTimelineOpen && (
                            <div 
                                className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
                                onClick={() => setMobileTimelineOpen(false)}
                            ></div>
                        )}
                        <div className={`order-last ${mobileTimelineOpen ? 'flex fixed right-0 top-[60px] bottom-0 z-50 shadow-xl' : 'hidden lg:flex z-30 relative shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.02)]'} w-16 xl:w-20 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex-col items-center py-4 shrink-0 transition-all duration-300`}>
                        <div className="position-relative flex-grow-1 w-100 d-flex justify-content-center py-4">
                            <div className="position-absolute top-4 bottom-4 bg-secondary rounded-pill shadow-inner transition-colors" style={{ width: "6px" }}></div>
                            
                            {/* Avatares según progreso */}
                            {collaborators.map((collab) => {
                                const topPercent = totalSections > 1 
                                    ? ((collab.sectionIndex - 1) / (totalSections - 1)) * 100 
                                    : 0;
                                
                                const colorObj = getUserColor(collab.userId);
                                
                                const isCurrentPage = collab.sectionIndex === progress;

                                return (
                                    <div 
                                        key={collab.userId} 
                                        onClick={() => {
                                            setCollabToNavigate(collab);
                                            if (window.innerWidth < 1024) setMobileSidebarOpen(false);
                                        }}
                                        className={`position-absolute transform -translate-x-1/2 -translate-y-1/2 d-flex flex-column align-items-center group cursor-pointer transition-all ${isCurrentPage ? 'z-20' : 'z-10'}`}
                                        style={{ top: `calc(1rem + (100% - 2rem) * ${topPercent / 100})`, left: '50%' }}
                                        title={`${collab.username} - Pág ${collab.sectionIndex}`}
                                    >
                                        <div className={`w-8 h-8 rounded-full border-2 ${colorObj.border} overflow-hidden bg-white shadow flex items-center justify-center transition-colors`}>
                                            {collab.avatarUrl ? (
                                                <img src={`${collab.avatarUrl}`} alt={collab.username} className=" object-cover" />
                                            ) : (
                                                <span className={`small fw-bold ${colorObj.text}`}>{collab.username.charAt(0).toUpperCase()}</span>
                                            )}
                                        </div>
                                        
                                        {/* Tooltip on hover */}
                                        <div className={`position-absolute right-12 top-1 bg-secondary text-white text-[10px] fw-bold px-2 py-1 rounded whitespace-nowrap shadow-lg opacity-0 group- transition-opacity pointer-events-none`}>
                                            Pág {currentBook?.format === 'pdf' ? collab.pdfPage : collab.sectionIndex}: {collab.username}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        <div className="mt-4 d-flex flex-column align-items-center">
                            <span className="text-[9px] text-secondary fw-bold">FIN</span>
                        </div>
                    </div>
                    </>
                )}
                {/* Floating buttons */}
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[60] flex flex-row items-center justify-content-center gap-3 md:hidden w-max">
                    {isAuthenticated && (
                        <>
                            <button
                                onClick={() => setShowMyAnnotations(!showMyAnnotations)}
                                className={`d-flex sm p-2 rounded-pill fw-bold shadow-lg align-items-center justify-content-center transition-all bg-white text-dark border border flex-shrink-0 ${!showMyAnnotations ? 'ring-2 ring-rose-500 text-rose-500' : 'text-primary'}`}
                                title={showMyAnnotations ? "Ocultar mis anotaciones" : "Mostrar mis anotaciones"}
                            >
                                {showMyAnnotations ? <i className="pi pi-user w-6 h-6 d-flex align-items-center justify-content-center"></i> : <i className="pi pi-user-minus w-6 h-6 d-flex align-items-center justify-content-center"></i>}
                            </button>
                            <button
                                onClick={() => setFocusMode(!focusMode)}
                                className={`d-flex sm p-2 rounded-pill fw-bold shadow-lg align-items-center justify-content-center transition-all bg-white text-dark border border flex-shrink-0 ${focusMode ? 'ring-2 ring-indigo-500 text-primary' : ''}`}
                                title={focusMode ? "Desactivar Modo Enfoque" : "Activar Modo Enfoque"}
                            >
                                {focusMode ? <i className="pi pi-eye-slash w-6 h-6 d-flex align-items-center justify-content-center"></i> : <i className="pi pi-eye w-6 h-6 d-flex align-items-center justify-content-center"></i>}
                            </button>
                            <button
                                onClick={() => setMobileTimelineOpen(!mobileTimelineOpen)}
                                className={`d-flex sm p-2 rounded-pill fw-bold shadow-lg align-items-center justify-content-center transition-all bg-white text-dark border border flex-shrink-0 ${mobileTimelineOpen ? 'ring-2 ring-indigo-500 text-primary' : ''}`}
                                title={mobileTimelineOpen ? "Ocultar progreso" : "Ver progreso"}
                            >
                                <i className="pi pi-clock w-6 h-6 d-flex align-items-center justify-content-center"></i>
                            </button>
                        </>
                    )}
                    
                    <button 
                        className="bg-primary text-white rounded-pill shadow-lg transition-transform d-flex align-items-center justify-content-center"
                        style={{ width: '3.5rem', height: '3.5rem' }}
                        onClick={() => {
                            if (focusMode) {
                                setFocusMode(false);
                                setMobileSidebarOpen(true);
                            } else {
                                setMobileSidebarOpen(!mobileSidebarOpen);
                            }
                        }}
                        title="Ver panel de actividad"
                    >
                        <i className="pi pi-plus" style={{ fontSize: '1.5rem' }}></i>
                    </button>
                </div>
            </div>
            {/* Modal de Navegación de Amigo */}
            {collabToNavigate && (
                <div className="position-fixed top-0 bottom-0 start-0 end-0 bg-black/60 z-[100] d-flex align-items-center justify-content-center p-4">
                    <div className="bg-white rounded-4 p-4 md max-w-sm w-100 shadow-lg transform transition-all">
                        <div className="text-center mb-5">
                            <div className="w-16 h-16 mx-auto rounded-pill bg-primary d-flex align-items-center justify-content-center mb-4 overflow-hidden border-4 border-white shadow">
                                {collabToNavigate.avatarUrl ? (
                                    <img src={`${collabToNavigate.avatarUrl}`} alt="Avatar" className=" object-cover" />
                                ) : (
                                    <span className="fs-3 fw-bold text-primary">{collabToNavigate.username.charAt(0).toUpperCase()}</span>
                                )}
                            </div>
                            <h3 className="fs-4 fw-bold text-dark mb-2">{collabToNavigate.username}</h3>
                            <p className="text-dark mb-2">Está leyendo en la <span className="fw-bold text-primary">Pág. {currentBook?.format === 'pdf' ? collabToNavigate.pdfPage : collabToNavigate.sectionIndex}</span></p>
                            
                            <div className="text-[11px] sm text-secondary mb-5 d-flex justify-content-center align-items-center gap-4 bg-light py-2 rounded border border-secondary border-opacity-25 w-100">
                                <span className="d-flex align-items-center gap-1">📅 {new Date(collabToNavigate.updatedAt).toLocaleDateString()}</span>
                                <span className="d-flex align-items-center gap-1">⏰ {new Date(collabToNavigate.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        </div>
                        
                        <div className="d-flex flex-column d-sm-flex-row gap-3 justify-content-center">
                            <button
                                onClick={() => setCollabToNavigate(null)}
                                className="px-5 py-2.5 rounded-4 fw-bold text-dark bg-secondary transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    if (currentBook?.format === 'pdf' && collabToNavigate.pdfPage != null) {
                                        const targetPage = collabToNavigate.pdfPage;
                                        const container = document.getElementById('main-scroll-container');
                                        const pageElement = document.getElementById(`pdf-page-${targetPage}`);
                                        if (container && pageElement) {
                                            const containerTop = container.getBoundingClientRect().top;
                                            const pageTop = pageElement.getBoundingClientRect().top;
                                            const scrollPos = container.scrollTop + (pageTop - containerTop) - 50;
                                            container.scrollTo({ top: scrollPos, behavior: 'smooth' });
                                        }
                                        // Delay closing the modal so the smooth scroll isn't cancelled
                                        setTimeout(() => {
                                            setCollabToNavigate(null);
                                        }, 600);
                                    } else {
                                        setProgress(collabToNavigate.sectionIndex);
                                        setCollabToNavigate(null);
                                    }
                                }}
                                className="px-5 py-2.5 rounded-4 fw-bold text-white bg-primary shadow transition-all"
                            >
                                Ir a esta página
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Dialog 
                visible={showAllFriendsCommentsModal} 
                onHide={() => setShowAllFriendsCommentsModal(false)}
                header="Comentarios recientes"
                style={isMobile ? { width: '100vw', margin: '0', maxHeight: '100vh', height: '100vh', borderRadius: '0' } : { width: '50vw' }}
                contentClassName="p-3"
                dismissableMask
            >
                <div className="d-flex flex-column gap-3">
                    {friendsComments.map((fc: any) => (
                        <div 
                            key={fc.id} 
                            className="bg-light p-3 rounded border border-secondary border-opacity-25 cursor-pointer transition-colors"
                            onClick={() => {
                                setShowAllFriendsCommentsModal(false);
                                if (window.innerWidth < 1024) setMobileSidebarOpen(false);
                                if (currentBook?.format === 'pdf' && fc.pdfPage) {
                                    const pageElement = document.getElementById(`pdf-page-${fc.pdfPage}`);
                                    if (pageElement) pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                } else {
                                    setProgress(fc.sectionIndex);
                                    setScrollToHighlightId(fc.highlightId);
                                }
                            }}
                        >
                            <div className="d-flex align-items-center gap-2 mb-1">
                                <div className="w-5 h-5 rounded-pill bg-primary d-flex align-items-center justify-content-center text-primary fw-bold text-[10px]">
                                    {fc.user.username.charAt(0).toUpperCase()}
                                </div>
                                <span className="small fw-bold text-dark">{fc.user.username}</span>
                                <span className="text-[10px] text-secondary ms-auto whitespace-nowrap flex-shrink-0">Pág {fc.sectionIndex}</span>
                            </div>
                            <p className="small text-dark text-truncate fst-italic">"{fc.content}"</p>
                        </div>
                    ))}
                </div>
            </Dialog>
        </div>
    );
};
