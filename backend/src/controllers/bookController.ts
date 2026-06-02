// @ts-nocheck
import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { sequelize } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import Book from '../models/Book';
import BookAccess from '../models/BookAccess';
import Highlight from '../models/Highlight';
import Comment from '../models/Comment';
import Progress from '../models/Progress';
import Notification from '../models/Notification';
import Section from '../models/Section';
import User from '../models/User';
import Tag from '../models/Tag';
import BookTag from '../models/BookTag';
import Friendship from '../models/Friendship';
import Favorite from '../models/Favorite';
import BookComment from '../models/BookComment';
import BookCommentReaction from '../models/BookCommentReaction';
import { io } from '../index';
import { onlineUsers } from '../socketManager';
import { segmentText } from '../utils/pagination';
import fs from 'fs';
import pdfParse from 'pdf-parse';

    export const uploadBook = async (req: Request, res: Response): Promise<void> => {
        try {
            const authReq = req as AuthRequest;
            const userId = authReq.user!.id;
            const { title, author, description, coverUrl, visibility, allowedUsers, pagesPerSection, tags } = req.body;
    
            if (!req.file) {
                res.status(400).json({ message: 'Se requiere un archivo .txt o .pdf' });
                return;
            }
    
            const isPdf = req.file.mimetype === 'application/pdf';
            const isTxt = req.file.mimetype === 'text/plain';
    
            if (!isPdf && !isTxt) {
                fs.unlinkSync(req.file.path);
                res.status(400).json({ message: 'Solo se permiten archivos de texto (.txt) o PDF (.pdf)' });
                return;
            }
    
            const MAX_SIZE = 20 * 1024 * 1024;
            if (authReq.user?.role !== 'admin' && req.file.size > MAX_SIZE) {
                fs.unlinkSync(req.file.path);
                res.status(400).json({ message: 'El archivo excede el límite de 20MB' });
                return;
            }
    
            let savedBook;
            let totalSections = 0;
            
            if (isTxt) {
                const textContent = fs.readFileSync(req.file.path, 'utf-8');
                const sectionsData = segmentText(textContent);
                fs.unlinkSync(req.file.path); // Borrar el .txt original ya que está en DB
    
                savedBook = await Book.create({
                    title,
                    author,
                    description: description || null,
                    coverUrl: coverUrl || '',
                    creatorId: userId,
                    visibility: visibility || 'public',
                    format: 'txt'
                });
    
                const sectionPromises = sectionsData.map((sec, index) => {
                    return Section.create({
                        bookId: savedBook.id,
                        sectionIndex: index + 1,
                        content: sec.content,
                        wordCount: sec.wordCount
                    });
                });
                await Promise.all(sectionPromises);
                totalSections = sectionsData.length;
            } else {
                // PDF
                const dataBuffer = fs.readFileSync(req.file.path);
                const pdfData = await pdfParse(dataBuffer);
                const totalPages = pdfData.numpages;
                const pps = pagesPerSection ? parseInt(pagesPerSection) : 5;
                const numSections = Math.ceil(totalPages / pps);
    
                savedBook = await Book.create({
                    title,
                    author,
                    description: description || null,
                    coverUrl: coverUrl || '',
                    creatorId: userId,
                    visibility: visibility || 'public',
                    format: 'pdf',
                    fileUrl: `/uploads/books/${req.file.filename}`
                });
    
                const sectionPromises = [];
                for (let i = 0; i < numSections; i++) {
                    const startPage = i * pps + 1;
                    const endPage = Math.min((i + 1) * pps, totalPages);
                    sectionPromises.push(Section.create({
                        bookId: savedBook.id,
                        sectionIndex: i + 1,
                        content: JSON.stringify({ startPage, endPage }),
                        wordCount: endPage - startPage + 1
                    }));
                }
                await Promise.all(sectionPromises);
                totalSections = numSections;
            }

        await BookAccess.create({
            bookId: savedBook.id,
            userId: userId,
            grantedById: userId
        });

        if ((visibility === 'restricted' || visibility === 'public') && allowedUsers) {
            let usersArray: string[] = [];
            try {
                usersArray = JSON.parse(allowedUsers);
            } catch(e) {
                if (typeof allowedUsers === 'string') {
                    usersArray = allowedUsers.split(',').map(id => id.trim());
                }
            }

            for (const friendId of usersArray) {
                await BookAccess.create({
                    bookId: savedBook.id,
                    userId: friendId,
                    grantedById: userId
                });

                const notification = await Notification.create({
                    userId: friendId,
                    senderId: userId,
                    type: 'book_access',
                    message: `${authReq.user!.username} te añadió para leer este archivo juntos: ${title}`,
                    relatedId: savedBook.id
                });

                const socketId = onlineUsers.get(friendId);
                if (socketId) {
                    io.to(socketId).emit('new_notification', notification);
                }
            }
        }

        if (tags) {
            let tagsArray: string[] = [];
            try {
                tagsArray = JSON.parse(tags);
            } catch(e) {
                if (typeof tags === 'string') {
                    tagsArray = tags.split(',').map(id => id.trim());
                }
            }
            if (tagsArray.length > 0) {
                const bookTags = tagsArray.map(tagId => ({ bookId: savedBook.id, tagId }));
                await BookTag.bulkCreate(bookTags);
            }
        }

        res.status(201).json({ message: 'Libro procesado existosamente', bookId: savedBook.id, sectionsInfo: totalSections });
    } catch (error) {
        console.error('Error uploading book:', error);
        res.status(500).json({ message: 'Error en el servidor', error: (error as any).message });
    }
};



export const getUserBooks = async (req: Request, res: Response): Promise<void> => {
    try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;

        let books;
        if (userId) {
            const accesses = await BookAccess.findAll({
                where: { userId },
                attributes: ['bookId']
            });

            const favorites = await Favorite.findAll({
                where: { userId },
                attributes: ['bookId']
            });

            const bookIds = [...new Set([
                ...accesses.map((a: any) => a.bookId),
                ...favorites.map((f: any) => f.bookId)
            ])];

            const userBooks = await Book.findAll({
                where: { id: bookIds },
                include: [{
                    model: User,
                    as: 'creator',
                    attributes: ['username', 'avatarUrl']
                }, {
                    model: User,
                    as: 'originalUploader',
                    attributes: ['username']
                }, {
                    model: Tag,
                    as: 'tags',
                    attributes: ['id', 'name']
                }]
            });

            books = await Promise.all(userBooks
                .map(async (book: any) => {
                    let allowedUsers: string[] = [];
                    let allowedUsersDetails: any[] = [];
                    if (book.visibility === 'restricted' || book.visibility === 'public') {
                        const bookAccesses = await BookAccess.findAll({ 
                            where: { bookId: book.id },
                            include: [{ model: User, as: 'user', attributes: ['id', 'username', 'avatarUrl'] }] 
                        });
                        
                        if (book.creatorId === userId) {
                            allowedUsers = bookAccesses.filter((ba: any) => ba.userId !== userId).map((ba: any) => ba.userId);
                            allowedUsersDetails = bookAccesses.filter((ba: any) => ba.userId !== userId).map((ba: any) => ({
                                id: ba.user?.id,
                                username: ba.user?.username,
                                avatarUrl: ba.user?.avatarUrl
                            }));
                        } else {
                            allowedUsersDetails = bookAccesses.filter((ba: any) => ba.userId !== book.creatorId).map((ba: any) => ({
                                id: ba.user?.id,
                                username: ba.user?.username,
                                avatarUrl: ba.user?.avatarUrl
                            }));
                        }
                    }

                    const favoritesCount = await Favorite.count({ where: { bookId: book.id } });
                    const isFavorited = await Favorite.findOne({ where: { bookId: book.id, userId } }) !== null;

                    return {
                        id: book.id,
                        title: book.title,
                        author: book.author,
                        coverUrl: book.coverUrl,
                        visibility: book.visibility,
                        allowedUsers,
                        allowedUsersDetails,
                        favoritesCount,
                        isFavorited,
                        isOwner: book.creatorId === userId,
                        progress: 0,
                        creator: book.creator ? {
                            username: book.creator.username,
                            avatarUrl: book.creator.avatarUrl
                        } : null,
                        isDuplicate: book.isDuplicate,
                        format: book.format,
                        tags: book.tags || [],
                        originalUploader: book.originalUploader ? {
                            username: book.originalUploader.username
                        } : null
                    };
                }));
        }
        
        if (userId && authReq.user?.role === 'admin') {
            const allBooks = await Book.findAll({
                attributes: ['id', 'title', 'author', 'creatorId', 'visibility', 'coverUrl', 'isDuplicate', 'originalUploaderId', 'format'],
                include: [{
                    model: User,
                    as: 'creator',
                    attributes: ['username', 'avatarUrl']
                }, {
                    model: User,
                    as: 'originalUploader',
                    attributes: ['username']
                }, {
                    model: Tag,
                    as: 'tags',
                    attributes: ['id', 'name']
                }]
            });
            const allAccesses = await BookAccess.findAll({
                where: { bookId: allBooks.map((b: any) => b.id) },
                include: [{ model: User, as: 'user', attributes: ['id', 'username'] }]
            });

            books = await Promise.all(allBooks.map(async book => {
                let allowedUsers: string[] = [];
                let adminAllowedUsersDetails: any[] = [];
                if (book.visibility === 'restricted') {
                    const accessesForBook = allAccesses.filter((ba: any) => ba.bookId === book.id && ba.userId !== book.creatorId);
                    allowedUsers = accessesForBook.map((ba: any) => ba.userId);
                    adminAllowedUsersDetails = accessesForBook.map((ba: any) => ({
                        id: ba.user?.id,
                        username: ba.user?.username
                    }));
                }
                const favoritesCount = await Favorite.count({ where: { bookId: book.id } });
                const isFavorited = await Favorite.findOne({ where: { bookId: book.id, userId } }) !== null;
                
                return {
                    id: book.id,
                    title: book.title,
                    author: book.author,
                    coverUrl: book.coverUrl,
                    visibility: book.visibility,
                    allowedUsers,
                    adminAllowedUsersDetails,
                    favoritesCount,
                    isFavorited,
                    isOwner: book.creatorId === userId,
                    progress: 0,
                    creator: book.creator ? {
                        username: book.creator.username,
                        avatarUrl: book.creator.avatarUrl
                    } : null,
                    isDuplicate: book.isDuplicate,
                    format: book.format,
                    tags: book.tags || [],
                    originalUploader: book.originalUploader ? {
                        username: book.originalUploader.username
                    } : null
                };
            }));
        } else if (!userId) {
            const allBooks = await Book.findAll({
                where: { visibility: 'public' },
                attributes: ['id', 'title', 'author', 'creatorId', 'visibility', 'coverUrl', 'isDuplicate', 'originalUploaderId', 'format'],
                include: [{
                    model: User,
                    as: 'creator',
                    attributes: ['username', 'avatarUrl']
                }, {
                    model: User,
                    as: 'originalUploader',
                    attributes: ['username']
                }, {
                    model: Tag,
                    as: 'tags',
                    attributes: ['id', 'name']
                }]
            });
            books = await Promise.all(allBooks.map(async book => {
                const favoritesCount = await Favorite.count({ where: { bookId: book.id } });
                const annotatorsCount = await BookAccess.count({ where: { bookId: book.id, userId: { [Op.ne]: book.creatorId } } });
                
                return {
                    id: book.id,
                    title: book.title,
                    author: book.author,
                    coverUrl: book.coverUrl,
                    visibility: book.visibility,
                    allowedUsers: [],
                    annotatorsCount,
                    favoritesCount,
                    isFavorited: false,
                    isOwner: false,
                    progress: 0,
                    creator: book.creator ? { username: book.creator.username, avatarUrl: book.creator.avatarUrl } : null,
                    isDuplicate: book.isDuplicate,
                    format: book.format,
                    tags: book.tags || [],
                    originalUploader: book.originalUploader ? { username: book.originalUploader.username } : null
                };
            }));
        }

        // Add progress
        for (const b of books) {
            if (userId) {
                let currentSec = 0;
                const progress = await Progress.findOne({ where: { bookId: b.id, userId } });
                if (progress) {
                    currentSec = progress.currentSectionIndex;
                } else {
                    const bookmark = await Highlight.findOne({ where: { bookId: b.id, userId, type: 'bookmark' } });
                    if (bookmark) {
                        const section = await Section.findByPk(bookmark.sectionId);
                        if (section) currentSec = section.sectionIndex;
                    }
                }

                if (currentSec > 0) {
                    const totalSections = await Section.count({ where: { bookId: b.id } });
                    b.progress = totalSections > 0 ? Math.round((currentSec / totalSections) * 100) : 0;
                }
            }
        }

        res.status(200).json(books);
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: (error as any).message });
    }
};

export const uploadBookCover = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const authReq = req as AuthRequest;
        const userId = authReq.user!.id;

        const book = await Book.findOne({ where: { id, creatorId: userId } });
        if (!book) {
            res.status(404).json({ message: 'Libro no encontrado o no tienes permiso' });
            return;
        }

        if (!req.file) {
            res.status(400).json({ message: 'Se requiere una imagen' });
            return;
        }

        const coverUrl = `/uploads/covers/${req.file.filename}`;
        if (book.isDuplicate && book.visibility === 'public') {
            res.status(400).json({ message: 'Los libros duplicados no pueden ser públicos.' });
            return;
        }
        await book.update({ coverUrl });

        res.status(200).json({ message: 'Portada actualizada', coverUrl });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: (error as any).message });
    }
};

export const getSection = async (req: Request, res: Response): Promise<void> => {
    try {
        const { bookId, sectionIndex } = req.params;
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;

        const book = await Book.findByPk(bookId);
        if (!book) {
            res.status(404).json({ message: 'Libro no encontrado' });
            return;
        }

        // Verify access
        const isCreator = userId && book.creatorId === userId;
        if (book.visibility !== 'public' && !isCreator) {
            if (!userId) {
                res.status(403).json({ message: 'Debes iniciar sesión para leer este libro' });
                return;
            }
            const access = await BookAccess.findOne({ where: { bookId, userId } });
            if (!access) {
                res.status(403).json({ message: 'No tienes acceso a este libro' });
                return;
            }
        }

        const section = await Section.findOne({ where: { bookId, sectionIndex: parseInt(sectionIndex) } });
        if (!section) {
            res.status(404).json({ message: 'Sección no encontrada' });
            return;
        }

        const totalSections = await Section.count({ where: { bookId } });
        
        let highlightsData: any[] = [];
        const highlightWhere = book.format === 'pdf' ? { bookId: book.id } : { sectionId: section.id };
        highlightsData = await Highlight.findAll({ 
            where: highlightWhere,
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'username', 'avatarUrl']
            }, {
                model: Comment,
                as: 'comments',
                attributes: ['content', 'userId', 'createdAt'],
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['username']
                }]
            }]
        });

        const accesses = await BookAccess.findAll({ where: { bookId: book.id } });
        const sharedCircleIds = accesses.map((a: any) => a.userId);
        sharedCircleIds.push(book.creatorId);

        let canAnnotate = isCreator || (userId && sharedCircleIds.includes(userId));

        // Filter highlights based on visibility
        highlightsData = highlightsData.filter((h: any) => {
            // Own highlights are always visible to the user
            if (userId && h.userId === userId) return true;
            
            // Bookmarks visibility
            if (h.type === 'bookmark') {
                if (canAnnotate && sharedCircleIds.includes(h.userId)) {
                    return true;
                }
                return false;
            }

            if (isCreator) {
                // Creator sees all other annotations
                return true;
            }

            // Creator highlights are visible if enabled globally
            if (book.showCreatorAnnotations && h.userId === book.creatorId) return true;
            
            // Other users' public highlights are visible
            if (h.isPublic) return true;
            
            return false;
        });

        res.status(200).json({
            id: section.id,
            content: section.content,
            totalSections,
            book: {
                id: book.id,
                title: book.title,
                author: book.author,
                coverUrl: book.coverUrl,
                visibility: book.visibility,
                creatorId: book.creatorId,
                format: book.format,
                fileUrl: book.fileUrl,
                isCreator,
                canAnnotate
            },
            highlights: highlightsData.map(h => ({ 
                id: h.id,
                text: h.text, 
                startIndex: h.startIndex, 
                endIndex: h.endIndex,
                type: h.type,
                style: h.style,
                color: h.color,
                rectangles: h.rectangles,
                isPublic: h.isPublic,
                userId: h.userId,
                user: h.user ? {
                    id: h.user.id,
                    username: h.user.username,
                    avatarUrl: h.user.avatarUrl
                } : null,
                comments: h.comments ? h.comments.map((c: any) => ({
                    content: c.content,
                    userId: c.userId,
                    username: c.user ? c.user.username : 'Usuario',
                    createdAt: c.createdAt
                })) : []
            }))
        });

    } catch (error) {
        res.status(500).json({ message: 'Error al obtener la sección', error: (error as any).message });
    }
};

export const saveHighlight = async (req: Request, res: Response): Promise<void> => {
    try {
        const { bookId, sectionId } = req.params;
        const { text, startIndex, endIndex, type, style, commentText, color, rectangles } = req.body;
        const authReq = req as AuthRequest;
        const userId = authReq.user!.id;

        // Validar si la sección pertenece al libro
        const section = await Section.findOne({ where: { id: sectionId, bookId } });
        if (!section) {
            res.status(404).json({ message: 'Sección no válida' });
            return;
        }
        
        const book = await Book.findByPk(bookId);
        if (!book) {
            res.status(404).json({ message: 'Libro no encontrado' });
            return;
        }

        if (book.creatorId !== userId) {
            const hasAccess = await BookAccess.findOne({ where: { bookId, userId } });
            if (!hasAccess) {
                res.status(403).json({ message: 'No tienes permiso para anotar en este libro.' });
                return;
            }
        }

        const highlightType = type || 'bookmark';

        // Si es "Aquí me quedé" (bookmark), borramos las marcas anteriores de bookmark
        if (highlightType === 'bookmark') {
            await Highlight.destroy({ where: { bookId, userId, type: 'bookmark' } });

            // Actualizar también el avance real en la tabla Progress
            const [progressRecord] = await Progress.findOrCreate({
                where: { bookId: bookId as string, userId },
                defaults: { bookId: bookId as string, userId, currentSectionIndex: section.sectionIndex, progressPercentage: 0 }
            });
            progressRecord.currentSectionIndex = section.sectionIndex;
            await progressRecord.save();
        }

        const highlight = await Highlight.create({
            bookId,
            sectionId,
            userId,
            text,
            startIndex: startIndex || 0,
            endIndex: endIndex || 0,
            type: highlightType,
            style: style || null,
            color: color || '#fef08a', // default yellow
            rectangles: rectangles ? JSON.stringify(rectangles) : null,
            isPublic: req.body.isPublic || false
        });

        if (commentText && commentText.trim().length > 0) {
            await Comment.create({
                bookId,
                sectionId,
                userId,
                highlightId: highlight.id,
                content: commentText.trim()
            });
        }

        res.status(201).json({ message: 'Resaltado guardado', highlight });
    } catch (error) {
        res.status(500).json({ message: 'Error al guardar resaltado', error: (error as any).message });
    }
};

export const deleteHighlight = async (req: Request, res: Response): Promise<void> => {
    try {
        const { bookId, highlightId } = req.params;
        const authReq = req as AuthRequest;
        const userId = authReq.user!.id;

        const highlight = await Highlight.findOne({ where: { id: highlightId, bookId } });
        const book = await Book.findByPk(bookId);
        if (book && book.creatorId !== userId) {
            const hasAccess = await BookAccess.findOne({ where: { bookId, userId } });
            if (!hasAccess) {
                res.status(403).json({ message: 'No tienes permiso para modificar anotaciones en este libro.' });
                return;
            }
        }
        if (!highlight) {
            res.status(404).json({ message: 'Resaltado no encontrado' });
            return;
        }

        if (highlight.userId !== userId) {
            res.status(403).json({ message: 'No tienes permiso para eliminar este resaltado' });
            return;
        }

        await Comment.destroy({ where: { highlightId } });
        await highlight.destroy();
        res.status(200).json({ message: 'Resaltado eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar resaltado', error: (error as any).message });
    }
};

export const updateHighlightComment = async (req: Request, res: Response): Promise<void> => {
    try {
        const { bookId, highlightId } = req.params;
        const { content, isPublic } = req.body;
        const authReq = req as AuthRequest;
        const userId = authReq.user!.id;

        const highlight = await Highlight.findOne({ where: { id: highlightId, bookId } });
        const book = await Book.findByPk(bookId);
        if (book && book.creatorId !== userId) {
            const hasAccess = await BookAccess.findOne({ where: { bookId, userId } });
            if (!hasAccess) {
                res.status(403).json({ message: 'No tienes permiso para modificar anotaciones en este libro.' });
                return;
            }
        }
        if (!highlight) {
            res.status(404).json({ message: 'Resaltado no encontrado' });
            return;
        }

        if (highlight.userId !== userId) {
            res.status(403).json({ message: 'No tienes permiso para editar este comentario' });
            return;
        }

        let comment = await Comment.findOne({ where: { highlightId } });
        
        if (isPublic !== undefined) {
            await highlight.update({ isPublic });
        }
        
        if (!content || content.trim() === '') {
            if (comment) await comment.destroy();
            res.status(200).json({ message: 'Comentario eliminado exitosamente' });
            return;
        }

        if (comment) {
            await comment.update({ content: content.trim() });
        } else {
            comment = await Comment.create({
                bookId,
                sectionId: highlight.sectionId,
                userId,
                highlightId: highlight.id,
                content: content.trim()
            });
        }
        res.status(200).json({ message: 'Comentario actualizado correctamente', comment });
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar comentario', error: (error as any).message });
    }
};

export const updateBook = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { title, author, description, visibility, allowedUsers, tags, coverUrl } = req.body;
        const authReq = req as AuthRequest;
        const userId = authReq.user!.id;

        const book = await Book.findByPk(id);
        if (!book) {
            res.status(404).json({ message: 'Libro no encontrado' });
            return;
        }

        const isAdminEdit = book.creatorId !== userId && authReq.user?.role === 'admin';

        if (book.creatorId !== userId && !isAdminEdit) {
            res.status(403).json({ message: 'No tienes permiso para editar este libro' });
            return;
        }

        if (isAdminEdit) {
            await book.update({
                title: title !== undefined ? title : book.title,
                author: author !== undefined ? author : book.author,
                description: description !== undefined ? description : book.description,
                coverUrl: coverUrl !== undefined ? coverUrl : book.coverUrl
            });
            res.status(200).json({ message: 'Libro actualizado exitosamente por administrador', book });
            return;
        }

        if (book.isDuplicate && visibility === 'public') {
            res.status(400).json({ message: 'Los libros duplicados no pueden ser públicos.' });
            return;
        }
        await book.update({
            title: title !== undefined ? title : book.title,
            author: author !== undefined ? author : book.author,
            description: description !== undefined ? description : book.description,
            visibility: visibility !== undefined ? visibility : book.visibility,
            coverUrl: coverUrl !== undefined ? coverUrl : book.coverUrl,
            showCreatorAnnotations: req.body.showCreatorAnnotations !== undefined ? req.body.showCreatorAnnotations : book.showCreatorAnnotations
        });

        if ((visibility === 'restricted' || visibility === 'public') && allowedUsers) {
            let usersArray: string[] = [];
            try {
                usersArray = Array.isArray(allowedUsers) ? allowedUsers : JSON.parse(allowedUsers);
            } catch(e) {
                if (typeof allowedUsers === 'string') {
                    usersArray = allowedUsers.split(',').map(id => id.trim());
                }
            }

            const oldAccesses = await BookAccess.findAll({ where: { bookId: id, userId: { [Op.ne]: userId } } });
            const oldUserIds = oldAccesses.map((a: any) => a.userId);

            await BookAccess.destroy({ where: { bookId: id, userId: { [Op.ne]: userId } } });

            for (const friendId of usersArray) {
                await BookAccess.create({
                    bookId: id,
                    userId: friendId,
                    grantedById: userId
                });

                if (!oldUserIds.includes(friendId)) {
                    const notification = await Notification.create({
                        userId: friendId,
                        senderId: userId,
                        type: 'book_access',
                        message: `${authReq.user!.username} te añadió para leer este archivo juntos: ${title || book.title}`,
                        relatedId: id
                    });

                    const socketId = onlineUsers.get(friendId);
                    if (socketId) {
                        io.to(socketId).emit('new_notification', notification);
                    }
                }
            }
        } else if (visibility === 'private' || visibility === 'public') {
            await BookAccess.destroy({ where: { bookId: id, userId: { [Op.ne]: userId } } });
        }

        if (tags !== undefined) {
            let tagsArray: string[] = [];
            try {
                tagsArray = Array.isArray(tags) ? tags : JSON.parse(tags);
            } catch(e) {
                if (typeof tags === 'string') {
                    tagsArray = tags.split(',').map(tagId => tagId.trim()).filter(Boolean);
                }
            }
            
            await BookTag.destroy({ where: { bookId: id } });
            
            if (tagsArray.length > 0) {
                const bookTags = tagsArray.map(tagId => ({ bookId: id, tagId }));
                await BookTag.bulkCreate(bookTags);
            }
        }

        res.status(200).json({ message: 'Libro actualizado exitosamente', book });
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar el libro', error: (error as any).message });
    }
};

export const deleteBook = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const authReq = req as AuthRequest;
        const userId = authReq.user!.id;

        const book = await Book.findByPk(id);
        if (!book) {
            res.status(404).json({ message: 'Libro no encontrado' });
            return;
        }

        if (book.creatorId !== userId && authReq.user?.role !== 'admin') {
            res.status(403).json({ message: 'No tienes permiso para eliminar este libro' });
            return;
        }

        // Manually destroy dependent rows since ON DELETE CASCADE might not be configured in the schema
        await Comment.destroy({ where: { bookId: id } });
        await Progress.destroy({ where: { bookId: id } });
        await Highlight.destroy({ where: { bookId: id } });
        await Section.destroy({ where: { bookId: id } });
        await BookAccess.destroy({ where: { bookId: id } });
        await book.destroy();

        res.status(200).json({ message: 'Libro eliminado exitosamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar el libro', error: (error as any).message });
    }
};



export const getBookmark = async (req: Request, res: Response): Promise<void> => {
    try {
        const { bookId } = req.params;
        const authReq = req as AuthRequest;
        const userId = authReq.user!.id;

        // Primero buscar el marcador explícito de "Aquí me quedé"
        const highlight = await Highlight.findOne({ where: { bookId, userId, type: 'bookmark' } });
        
        if (highlight) {
            const section = await Section.findByPk(highlight.sectionId);
            if (section) {
                res.status(200).json({ 
                    sectionIndex: section.sectionIndex,
                    highlightId: highlight.id,
                    pdfPage: highlight.startIndex 
                });
                return;
            }
        }

        // Si no hay marca, retorna la sección 1 por defecto
        res.status(200).json({ sectionIndex: 1 });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener la marca', error: (error as any).message });
    }
};

export const searchBooks = async (req: Request, res: Response): Promise<void> => {
    try {
        const { q, tags, publicOnly, author, creator, sortBy } = req.query;
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;

        let accessibleBookIds: string[] = [];
        if (userId && publicOnly !== 'true') {
            const accesses = await BookAccess.findAll({ where: { userId } });
            accessibleBookIds = accesses.map(a => a.bookId);
        }

        const whereClause: any = {
            [Op.and]: [
                {
                    [Op.or]: [
                        { visibility: 'public' },
                        ...(accessibleBookIds.length > 0 ? [{ id: { [Op.in]: accessibleBookIds } }] : [])
                    ]
                }
            ]
        };

        if (q && typeof q === 'string' && q.trim().length > 0) {
            whereClause[Op.and].push({ title: { [Op.like]: `%${q}%` } });
        }
        
        if (author && typeof author === 'string' && author.trim().length > 0) {
            whereClause[Op.and].push({ author: { [Op.like]: `%${author}%` } });
        }

        let creatorIds: string[] = [];
        if (creator && typeof creator === 'string' && creator.trim().length > 0) {
            const creators = await User.findAll({
                where: { username: { [Op.like]: `%${creator}%` } },
                attributes: ['id']
            });
            creatorIds = creators.map(c => c.id);
            if (creatorIds.length > 0) {
                whereClause[Op.and].push({ creatorId: { [Op.in]: creatorIds } });
            } else {
                res.status(200).json([]);
                return;
            }
        }

        let orderOptions: any = [];
        if (sortBy === 'date_asc') {
            orderOptions = [['createdAt', 'ASC']];
        } else if (sortBy === 'date_desc') {
            orderOptions = [['createdAt', 'DESC']];
        }

        if (!q && !author && !creator && !tags && !sortBy) {
             orderOptions = sequelize.random();
        } else if (orderOptions.length === 0 && sortBy !== 'popular') {
             orderOptions = [['createdAt', 'DESC']];
        }

        let books = await Book.findAll({
            where: whereClause,
            attributes: ['id', 'title', 'author', 'coverUrl', 'creatorId', 'createdAt'],
            include: [{
                model: User,
                as: 'creator',
                attributes: ['username', 'avatarUrl']
            }, {
                model: Tag,
                as: 'tags',
                attributes: ['id', 'name'],
                ...(tags ? { where: { id: { [Op.in]: Array.isArray(tags) ? tags : [tags] } } } : {})
            }],
            order: orderOptions.length > 0 ? orderOptions : undefined,
            limit: 50
        });

        let favoritesCountMap: Record<string, number> = {};
        if (sortBy === 'popular') {
            const allFavs = await Favorite.findAll({
                where: { bookId: { [Op.in]: books.map(b => b.id) } },
                attributes: ['bookId']
            });
            for (const f of allFavs) {
                favoritesCountMap[f.bookId] = (favoritesCountMap[f.bookId] || 0) + 1;
            }
            
            books.sort((a, b) => {
                const favsA = favoritesCountMap[a.id] || 0;
                const favsB = favoritesCountMap[b.id] || 0;
                return favsB - favsA;
            });
        }

        let userFavorites: string[] = [];
        if (userId) {
            const favs = await Favorite.findAll({ where: { userId, bookId: { [Op.in]: books.map(b => b.id) } } });
            userFavorites = favs.map(f => f.bookId);
        }

        const bookAccessCounts: Record<string, number> = {};
        const allAccesses = await BookAccess.findAll({
            where: { bookId: { [Op.in]: books.map(b => b.id) } }
        });
        for (const access of allAccesses) {
            bookAccessCounts[access.bookId] = (bookAccessCounts[access.bookId] || 0) + 1;
        }

        res.status(200).json(books.map(book => {
            const count = bookAccessCounts[book.id] || 0;
            const allowedUsersCount = count > 1 ? count - 1 : 0;
            return {
                id: book.id,
                title: book.title,
                author: book.author,
                coverUrl: book.coverUrl,
                creatorId: book.creatorId,
                tags: (book as any).tags || [],
                isFavorited: userFavorites.includes(book.id),
                allowedUsersCount,
                createdAt: (book as any).createdAt,
                favoritesCount: favoritesCountMap[book.id] || 0,
                // @ts-ignore
                creator: book.creator ? { username: book.creator.username, avatarUrl: book.creator.avatarUrl } : null
            };
        }));
    } catch (error) {
        res.status(500).json({ message: 'Error en la búsqueda de libros', error: (error as any).message });
    }
};

export const getCollaboratorsProgress = async (req: Request, res: Response): Promise<void> => {
    try {
        const { bookId } = req.params;
        const authReq = req as AuthRequest;
        const userId = authReq.user!.id;

        const book = await Book.findByPk(bookId);
        const isCreator = book?.creatorId === userId;
        const access = await BookAccess.findOne({ where: { bookId, userId } });
        if (!isCreator && !access) {
            res.status(403).json({ message: 'No tienes acceso a este libro' });
            return;
        }

        // Fetch only "bookmark" highlights for this book
        const accessesAll = await BookAccess.findAll({ where: { bookId } });
        const sharedCircleIds = accessesAll.map((a: any) => a.userId);
        sharedCircleIds.push(book?.creatorId);

        const highlights = await Highlight.findAll({
            where: { 
                bookId, 
                type: 'bookmark',
                userId: { [Op.in]: sharedCircleIds }
            },
            order: [['createdAt', 'DESC']],
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'username', 'avatarUrl']
            }, {
                model: Section,
                as: 'section',
                attributes: ['sectionIndex']
            }]
        });

        // Deduplicate by user id (since ordered by DESC, the first one seen is the newest)
        const userMap = new Map();
        for (const h of highlights) {
            const uId = (h as any).user.id;
            if (!userMap.has(uId)) {
                userMap.set(uId, {
                    userId: uId,
                    username: (h as any).user.username,
                    avatarUrl: (h as any).user.avatarUrl,
                    sectionIndex: (h as any).section ? (h as any).section.sectionIndex : null,
                    pdfPage: h.startIndex,
                    updatedAt: h.updatedAt
                });
            }
        }

        res.status(200).json(Array.from(userMap.values()));
    } catch (error) {
        console.error('Error getting collaborators', error);
        res.status(500).json({ message: 'Error interno del servidor', error: (error as any).message });
    }
};

export const getFriendsComments = async (req: Request, res: Response): Promise<void> => {
    try {
        const { bookId } = req.params;
        const authReq = req as AuthRequest;
        const userId = authReq.user!.id;

        const book = await Book.findByPk(bookId);
        const isCreator = book?.creatorId === userId;
        const access = await BookAccess.findOne({ where: { bookId, userId } });
        if (!isCreator && !access) {
            res.status(403).json({ message: 'No tienes acceso a este libro' });
            return;
        }

        // Get friends
        const friendships = await Friendship.findAll({
            where: {
                [Op.or]: [{ requesterId: userId }, { recipientId: userId }],
                status: 'accepted'
            }
        });

        const friendIds = friendships.map(f => 
            f.requesterId === userId ? f.recipientId : f.requesterId
        );

        if (friendIds.length === 0) {
            res.status(200).json([]);
            return;
        }

        // Get recent comments from friends
        const comments = await Comment.findAll({
            where: { 
                bookId, 
                userId: { [Op.in]: friendIds },
                content: { [Op.not]: null, [Op.ne]: '' } as any
            },
            order: [['createdAt', 'DESC']],
            limit: 20,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'avatarUrl']
                },
                {
                    model: Section,
                    as: 'section',
                    attributes: ['id', 'sectionIndex']
                }
            ]
        });

        // Get the associated highlights if they exist to know the text
        const highlightIds = comments.map(c => c.highlightId).filter(id => id !== null);
        let highlights: any[] = [];
        if (highlightIds.length > 0) {
            highlights = await Highlight.findAll({
                where: { id: { [Op.in]: highlightIds as string[] } },
                attributes: ['id', 'text']
            });
        }

        const formattedComments = comments.map(c => {
            const hl = highlights.find(h => h.id === c.highlightId);
            return {
                id: c.id,
                highlightId: c.highlightId,
                content: c.content,
                createdAt: c.createdAt,
                highlightText: hl ? hl.text : null,
                sectionIndex: (c as any).section ? (c as any).section.sectionIndex : null,
                user: (c as any).user ? {
                    id: (c as any).user.id,
                    username: (c as any).user.username,
                    avatarUrl: (c as any).user.avatarUrl
                } : null
            };
        });

        res.status(200).json(formattedComments);
    } catch (error) {
        console.error('Error getting friends comments', error);
        res.status(500).json({ message: 'Error interno del servidor', error: (error as any).message });
    }
};

export const getAllAnnotations = async (req: Request, res: Response): Promise<void> => {
    try {
        const { bookId } = req.params;
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;

        const book = await Book.findByPk(bookId);
        if (!book) {
            res.status(404).json({ message: 'Libro no encontrado' });
            return;
        }

        const isCreator = userId && book.creatorId === userId;
        const access = userId ? await BookAccess.findOne({ where: { bookId, userId } }) : null;
        const hasFullAccess = isCreator || !!access;

        if (book.visibility !== 'public' && !hasFullAccess) {
            if (!userId) {
                res.status(403).json({ message: 'Debes iniciar sesión' });
                return;
            }
            res.status(403).json({ message: 'No tienes acceso a este libro' });
            return;
        }

        let annotations = await Highlight.findAll({
            where: { 
                bookId,
                type: { [Op.ne]: 'bookmark' }
            },
            order: [['createdAt', 'DESC']],
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'avatarUrl']
                },
                {
                    model: Comment,
                    as: 'comments',
                    attributes: ['id', 'content', 'createdAt']
                },
                {
                    model: Section,
                    as: 'section',
                    attributes: ['id', 'sectionIndex']
                }
            ]
        });

        if (!hasFullAccess) {
            if (book.visibility === 'public' && book.showCreatorAnnotations) {
                annotations = annotations.filter((a: any) => a.userId === book.creatorId && a.isPublic !== false);
            } else {
                annotations = [];
            }
        } else {
            annotations = annotations.filter((a: any) => {
                if (a.userId === userId) return true;
                if (a.isPublic === false) return false;
                return true;
            });
        }

        const formattedAnnotations = annotations.map((a: any) => ({
            id: a.id,
            text: a.text,
            type: a.type,
            style: a.style,
            color: a.color,
            createdAt: a.createdAt,
            sectionIndex: (a as any).section ? (a as any).section.sectionIndex : null,
            user: (a as any).user ? {
                id: (a as any).user.id,
                username: (a as any).user.username,
                avatarUrl: (a as any).user.avatarUrl
            } : null,
            comments: (a as any).comments || []
        }));

        res.status(200).json(formattedAnnotations);
    } catch (error) {
        console.error('Error getting all annotations', error);
        res.status(500).json({ message: 'Error interno del servidor', error: (error as any).message });
    }
};


export const duplicateBook = async (req: Request, res: Response): Promise<void> => {
    try {
        const { bookId } = req.params;
        const authReq = req as AuthRequest;
        const userId = authReq.user!.id;

        const originalBook = await Book.findByPk(bookId);
        if (!originalBook) {
            res.status(404).json({ message: 'Libro original no encontrado' });
            return;
        }

        if (originalBook.visibility !== 'public') {
            res.status(403).json({ message: 'Solo puedes duplicar libros públicos' });
            return;
        }

        const newBook = await Book.create({
            title: originalBook.title + ' (copia)',
            author: originalBook.author,
            coverUrl: originalBook.coverUrl,
            creatorId: userId,
            visibility: 'private',
            isDuplicate: true,
            originalUploaderId: originalBook.creatorId,
            format: originalBook.format,
            fileUrl: originalBook.fileUrl
        });

        const sections = await Section.findAll({ where: { bookId: originalBook.id } });
        for (const sec of sections) {
            await Section.create({
                bookId: newBook.id,
                sectionIndex: sec.sectionIndex,
                content: sec.content,
                wordCount: sec.wordCount
            });
        }

        await BookAccess.create({
            bookId: newBook.id,
            userId: userId,
            grantedById: userId
        });

        res.status(201).json({ message: 'Libro duplicado correctamente', newBookId: newBook.id });
    } catch (error) {
        res.status(500).json({ message: 'Error al duplicar el libro', error: (error as any).message });
    }
};

export const addFavorite = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const authReq = req as AuthRequest;
        const userId = authReq.user!.id;

        const book = await Book.findByPk(id);
        if (!book) {
            res.status(404).json({ message: 'Libro no encontrado' });
            return;
        }

        await Favorite.findOrCreate({
            where: { userId, bookId: id }
        });

        res.status(200).json({ message: 'Añadido a favoritos' });
    } catch (error) {
        res.status(500).json({ message: 'Error al añadir a favoritos', error: (error as any).message });
    }
};

export const removeFavorite = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const authReq = req as AuthRequest;
        const userId = authReq.user!.id;

        await Favorite.destroy({
            where: { userId, bookId: id }
        });

        res.status(200).json({ message: 'Removido de favoritos' });
    } catch (error) {
        res.status(500).json({ message: 'Error al remover de favoritos', error: (error as any).message });
    }
};

export const getBookDetails = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;

        const book = await Book.findByPk(id, {
            include: [{
                model: User,
                as: 'creator',
                attributes: ['username', 'avatarUrl']
            }, {
                model: User,
                as: 'originalUploader',
                attributes: ['username']
            }, {
                model: Tag,
                as: 'tags',
                attributes: ['id', 'name']
            }]
        });

        if (!book) {
            res.status(404).json({ message: 'Libro no encontrado' });
            return;
        }

        const isCreator = userId && book.creatorId === userId;
        if (book.visibility !== 'public' && !isCreator) {
            if (!userId) {
                res.status(403).json({ message: 'Debes iniciar sesión para ver este libro' });
                return;
            }
            const access = await BookAccess.findOne({ where: { bookId: id, userId } });
            if (!access) {
                res.status(403).json({ message: 'No tienes acceso a este libro' });
                return;
            }
        }

        const favoritesCount = await Favorite.count({ where: { bookId: id } });
        const isFavorited = userId ? (await Favorite.findOne({ where: { bookId: id, userId } }) !== null) : false;

        let currentSec = 0;
        let progress = 0;
        if (userId) {
            const prog = await Progress.findOne({ where: { bookId: id, userId } });
            if (prog) {
                currentSec = prog.currentSectionIndex;
            } else {
                const bookmark = await Highlight.findOne({ where: { bookId: id, userId, type: 'bookmark' } });
                if (bookmark) {
                    const section = await Section.findByPk(bookmark.sectionId);
                    if (section) currentSec = section.sectionIndex;
                }
            }
            if (currentSec > 0) {
                const totalSections = await Section.count({ where: { bookId: id } });
                progress = totalSections > 0 ? Math.round((currentSec / totalSections) * 100) : 0;
            }
        }

        const originalCreatorId = book.isDuplicate ? book.originalUploaderId : book.creatorId;
        const duplicates = await Book.findAll({
            where: { originalUploaderId: originalCreatorId, fileUrl: book.fileUrl },
            include: [{ model: User, as: 'creator', attributes: ['id', 'username', 'avatarUrl'] }]
        });
        const duplicateCount = duplicates.length;
        let duplicators: any[] = [];
        if (isCreator) {
            duplicators = duplicates.map(d => ({ 
                id: d.creatorId, 
                username: (d as any).creator?.username, 
                avatarUrl: (d as any).creator?.avatarUrl 
            }));
        }

        let allowedUsers: string[] = [];
        if (isCreator && (book.visibility === 'restricted' || book.visibility === 'public')) {
            const accesses = await BookAccess.findAll({ where: { bookId: id } });
            allowedUsers = accesses.filter((a: any) => a.userId !== userId).map((a: any) => a.userId);
        }

        res.status(200).json({
            id: book.id,
            title: book.title,
            author: book.author,
            description: book.description,
            coverUrl: book.coverUrl,
            visibility: book.visibility,
            format: book.format,
            isDuplicate: book.isDuplicate,
            creatorId: book.creatorId,
            createdAt: book.createdAt,
            creator: book.creator ? { username: (book as any).creator.username, avatarUrl: (book as any).creator.avatarUrl } : null,
            originalUploader: book.originalUploader ? { username: (book as any).originalUploader.username } : null,
            tags: (book as any).tags || [],
            favoritesCount,
            isFavorited,
            progress,
            isOwner: isCreator,
            duplicateCount,
            duplicators,
            allowedUsers
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener detalles del libro', error: (error as any).message });
    }
};

export const getBookComments = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;

        const book = await Book.findByPk(id);
        if (!book) {
            res.status(404).json({ message: 'Libro no encontrado' });
            return;
        }

        const isCreator = userId && book.creatorId === userId;
        if (book.visibility !== 'public' && !isCreator) {
            if (!userId) {
                res.status(403).json({ message: 'Acceso denegado' });
                return;
            }
            const access = await BookAccess.findOne({ where: { bookId: id, userId } });
            if (!access) {
                res.status(403).json({ message: 'Acceso denegado' });
                return;
            }
        }

        const comments = await BookComment.findAll({
            where: { bookId: id },
            order: [['createdAt', 'DESC']],
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'username', 'avatarUrl']
            }]
        });

        const commentIds = comments.map(c => c.id);
        const reactions = await BookCommentReaction.findAll({
            where: { commentId: { [Op.in]: commentIds } }
        });

        const formattedComments = comments.map((c: any) => {
            const cReactions = reactions.filter(r => r.commentId === c.id);
            const likesCount = cReactions.filter(r => r.type === 'like').length;
            const dislikesCount = cReactions.filter(r => r.type === 'dislike').length;
            const userReaction = userId ? cReactions.find(r => r.userId === userId)?.type : null;

            return {
                id: c.id,
                content: c.content,
                parentId: c.parentId,
                createdAt: c.createdAt,
                likesCount,
                dislikesCount,
                userReaction,
                user: c.user ? {
                    id: c.user.id,
                    username: c.user.username,
                    avatarUrl: c.user.avatarUrl
                } : null
            };
        });

        res.status(200).json(formattedComments);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener comentarios', error: (error as any).message });
    }
};

export const addBookComment = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { content, parentId } = req.body;
        const authReq = req as AuthRequest;
        const userId = authReq.user!.id;

        if (!content || !content.trim()) {
            res.status(400).json({ message: 'El comentario no puede estar vacío' });
            return;
        }

        const book = await Book.findByPk(id);
        if (!book) {
            res.status(404).json({ message: 'Libro no encontrado' });
            return;
        }

        const isCreator = book.creatorId === userId;
        if (book.visibility !== 'public' && !isCreator) {
            const access = await BookAccess.findOne({ where: { bookId: id, userId } });
            if (!access) {
                res.status(403).json({ message: 'No tienes acceso a comentar este libro' });
                return;
            }
        }

        if (parentId) {
            const parentComment = await BookComment.findByPk(parentId);
            if (!parentComment) {
                res.status(404).json({ message: 'El comentario al que intentas responder no existe' });
                return;
            }

            if (parentComment.userId !== userId) {
                const bookInfo = await Book.findByPk(id);
                const notification = await Notification.create({
                    userId: parentComment.userId,
                    senderId: userId,
                    type: 'comment_reply',
                    message: `ha respondido a tu comentario en el libro "${bookInfo?.title}".`,
                    relatedId: id
                });
                const socketId = onlineUsers.get(parentComment.userId);
                if (socketId) {
                    io.to(socketId).emit('new_notification', notification);
                }
            }
        }

        const comment = await BookComment.create({
            bookId: id,
            userId,
            content: content.trim(),
            parentId: parentId || null
        });

        const commentWithUser = await BookComment.findByPk(comment.id, {
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'username', 'avatarUrl']
            }]
        });

        res.status(201).json({
            id: (commentWithUser as any).id,
            content: (commentWithUser as any).content,
            parentId: (commentWithUser as any).parentId,
            createdAt: (commentWithUser as any).createdAt,
            likesCount: 0,
            dislikesCount: 0,
            userReaction: null,
            user: (commentWithUser as any).user ? {
                id: (commentWithUser as any).user.id,
                username: (commentWithUser as any).user.username,
                avatarUrl: (commentWithUser as any).user.avatarUrl
            } : null
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al agregar comentario', error: (error as any).message });
    }
};

export const deleteBookComment = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id, commentId } = req.params;
        const authReq = req as AuthRequest;
        const userId = authReq.user!.id;

        const comment = await BookComment.findByPk(commentId);
        if (!comment) {
            res.status(404).json({ message: 'Comentario no encontrado' });
            return;
        }

        const book = await Book.findByPk(id);
        if (!book) {
            res.status(404).json({ message: 'Libro no encontrado' });
            return;
        }

        // Permisos: Dueño del comentario O dueño del libro (O Uploader)
        if (comment.userId !== userId && book.creatorId !== userId && book.originalUploaderId !== userId) {
            res.status(403).json({ message: 'No tienes permisos para eliminar este comentario' });
            return;
        }

        await comment.destroy();
        res.status(200).json({ message: 'Comentario eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar comentario', error: (error as any).message });
    }
};

export const reactToBookComment = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id, commentId } = req.params;
        const { type } = req.body; // 'like' | 'dislike'
        const authReq = req as AuthRequest;
        const userId = authReq.user!.id;

        if (type !== 'like' && type !== 'dislike') {
            res.status(400).json({ message: 'Tipo de reacción inválido' });
            return;
        }

        const comment = await BookComment.findByPk(commentId);
        if (!comment) {
            res.status(404).json({ message: 'Comentario no encontrado' });
            return;
        }

        const existingReaction = await BookCommentReaction.findOne({
            where: { commentId, userId }
        });

        if (existingReaction) {
            if (existingReaction.type === type) {
                // Toggle off if clicking the same reaction
                await existingReaction.destroy();
            } else {
                // Change reaction
                existingReaction.type = type;
                await existingReaction.save();
            }
        } else {
            // Create new reaction
            await BookCommentReaction.create({
                commentId,
                userId,
                type
            });

            if (type === 'like' && comment.userId !== userId) {
                const bookInfo = await Book.findByPk(id);
                const notification = await Notification.create({
                    userId: comment.userId,
                    senderId: userId,
                    type: 'comment_like',
                    message: `le ha dado me gusta a tu comentario en el libro "${bookInfo?.title}".`,
                    relatedId: id
                });
                const socketId = onlineUsers.get(comment.userId);
                if (socketId) {
                    io.to(socketId).emit('new_notification', notification);
                }
            }
        }

        res.status(200).json({ message: 'Reacción actualizada' });
    } catch (error) {
        res.status(500).json({ message: 'Error al reaccionar al comentario', error: (error as any).message });
    }
};
