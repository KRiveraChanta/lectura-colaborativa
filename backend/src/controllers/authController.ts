import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import User from '../models/User';
import Book from '../models/Book';
import Friendship from '../models/Friendship';
import Progress from '../models/Progress';
import Highlight from '../models/Highlight';
import Comment from '../models/Comment';
import Section from '../models/Section';
import { AuthRequest } from '../middleware/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_proyectito_123';

export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { username, email, password } = req.body;

        const existingUser = await User.findOne({
            where: {
                [Op.or]: [{ email }, { username }]
            }
        });
        
        if (existingUser) {
            res.status(400).json({ message: 'El usuario o correo electrónico ya existe' });
            return;
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const newUser = await User.create({ username, email, passwordHash });

        const token = jwt.sign({ id: newUser.id, username: newUser.username, role: newUser.role }, JWT_SECRET, {
            expiresIn: '7d'
        });

        res.status(201).json({ 
            message: 'Usuario registrado exitosamente', 
            token,
            user: { id: newUser.id, username: newUser.username, email: newUser.email, avatarUrl: newUser.avatarUrl, role: newUser.role }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: (error as any).message });
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ where: { email } });
        if (!user) {
            res.status(401).json({ message: 'Credenciales inválidas' });
            return;
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            res.status(401).json({ message: 'Credenciales inválidas' });
            return;
        }

        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, {
            expiresIn: '7d'
        });

        res.json({
            message: 'Login exitoso',
            token,
            user: { id: user.id, username: user.username, email: user.email, avatarUrl: user.avatarUrl, role: user.role }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: (error as any).message });
    }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const authReq = req as AuthRequest;
        const userId = authReq.user!.id;
        const { username, email, password, completedBooksVisibility, bio } = req.body;

        const user = await User.findByPk(userId);
        if (!user) {
            res.status(404).json({ message: 'Usuario no encontrado' });
            return;
        }

        // Check if username or email is taken by someone else
        const existingUser = await User.findOne({
            where: {
                [Op.or]: [{ email: email || '' }, { username: username || '' }],
                id: { [Op.ne]: userId }
            }
        });

        if (existingUser) {
            res.status(400).json({ message: 'El usuario o correo electrónico ya está en uso' });
            return;
        }

        if (username) user.username = username;
        if (email) user.email = email;
        if (password) {
            const salt = await bcrypt.genSalt(10);
            user.passwordHash = await bcrypt.hash(password, salt);
        }
        if (completedBooksVisibility) user.completedBooksVisibility = completedBooksVisibility;
        if (bio !== undefined) user.bio = bio;

        if (req.files) {
            const files = req.files as { [fieldname: string]: Express.Multer.File[] };
            if (files['avatar'] && files['avatar'].length > 0) {
                user.avatarUrl = `/uploads/avatars/${files['avatar'][0].filename}`;
            }
            if (files['cover'] && files['cover'].length > 0) {
                user.coverUrl = `/uploads/covers/${files['cover'][0].filename}`;
            }
        }

        await user.save();

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
            expiresIn: '7d'
        });

        res.status(200).json({
            message: 'Perfil actualizado exitosamente',
            token,
            user: { id: user.id, username: user.username, email: user.email, avatarUrl: user.avatarUrl, coverUrl: user.coverUrl, completedBooksVisibility: user.completedBooksVisibility, bio: user.bio }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar el perfil', error: (error as any).message });
    }
};

export const searchUsers = async (req: Request, res: Response): Promise<void> => {
    try {
        const { q } = req.query;
        if (!q || typeof q !== 'string') {
            res.status(400).json({ message: 'Se requiere un parámetro de búsqueda' });
            return;
        }

        const users = await User.findAll({
            where: {
                username: { [Op.like]: `%${q}%` }
            },
            attributes: ['id', 'username', 'avatarUrl'],
            limit: 20
        });

        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error en la búsqueda', error: (error as any).message });
    }
};

export const getUserProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const authReq = req as AuthRequest;
        const currentUserId = authReq.user!.id;

        const user = await User.findByPk(id, {
            attributes: ['id', 'username', 'email', 'avatarUrl', 'coverUrl', 'role', 'createdAt', 'completedBooksVisibility', 'bio']
        });

        if (!user) {
            res.status(404).json({ message: 'Usuario no encontrado' });
            return;
        }

        const publicBooks = await Book.findAll({
            where: { creatorId: id, visibility: 'public' },
            attributes: ['id', 'title', 'author', 'coverUrl', 'createdAt']
        });

        let friendshipStatus = 'none';
        let friendshipId = null;
        if (id !== currentUserId) {
            const friendship = await Friendship.findOne({
                where: {
                    [Op.or]: [
                        { requesterId: currentUserId, recipientId: id },
                        { requesterId: id, recipientId: currentUserId }
                    ]
                }
            });

            if (friendship) {
                if (friendship.status === 'accepted') {
                    friendshipStatus = 'friends';
                } else if (friendship.status === 'pending') {
                    friendshipStatus = friendship.requesterId === currentUserId ? 'request_sent' : 'request_received';
                    if (friendshipStatus === 'request_received') {
                        friendshipId = friendship.id;
                    }
                }
            }
        }

        let completedBooks: any[] = [];
        let canSeeLogros = false;
        
        if (id === currentUserId) {
            canSeeLogros = true;
        } else if (user.completedBooksVisibility === 'public') {
            canSeeLogros = true;
        } else if (user.completedBooksVisibility === 'friends' && friendshipStatus === 'friends') {
            canSeeLogros = true;
        }

        if (canSeeLogros) {
            const completedProgresses = await Progress.findAll({
                where: { userId: id, progressPercentage: 100 },
                include: [{ model: Book, as: 'book', attributes: ['id', 'title', 'author', 'coverUrl', 'createdAt'] }]
            });
            completedBooks = completedProgresses.map((p: any) => p.book).filter((b: any) => b != null);
        }

        const friendships = await Friendship.findAll({
            where: {
                status: 'accepted',
                [Op.or]: [
                    { requesterId: id },
                    { recipientId: id }
                ]
            },
            include: [
                { model: User, as: 'requester', attributes: ['id', 'username', 'avatarUrl'] },
                { model: User, as: 'recipient', attributes: ['id', 'username', 'avatarUrl'] }
            ]
        });

        const friends = friendships.map((f: any) => {
            if (f.requesterId === id) return f.recipient;
            return f.requester;
        });

        res.status(200).json({
            user,
            publicBooks,
            friendshipStatus,
            friendshipId,
            completedBooks,
            canSeeLogros,
            friends
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener el perfil', error: (error as any).message });
    }
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ where: { email } });
        if (!user) {
            res.status(404).json({ message: 'No existe un usuario con este correo electrónico' });
            return;
        }

        // Generar un token temporal válido por 15 minutos
        const resetToken = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '15m' });

        // Simulamos el envío del correo devolviendo el token en la respuesta
        res.status(200).json({ 
            message: 'Se ha generado un código de recuperación (simulación de correo).',
            token: resetToken 
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al procesar la solicitud', error: (error as any).message });
    }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            res.status(400).json({ message: 'Falta el token o la nueva contraseña' });
            return;
        }

        let decoded: any;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (err) {
            res.status(400).json({ message: 'El código de recuperación es inválido o ha expirado' });
            return;
        }

        const user = await User.findByPk(decoded.id);
        if (!user) {
            res.status(404).json({ message: 'Usuario no encontrado' });
            return;
        }

        const salt = await bcrypt.genSalt(10);
        user.passwordHash = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.status(200).json({ message: 'Contraseña actualizada exitosamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al restablecer contraseña', error: (error as any).message });
    }
};

export const getMyAnnotations = async (req: Request, res: Response): Promise<void> => {
    try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        
        if (!userId) {
            res.status(401).json({ message: 'No autorizado' });
            return;
        }

        const annotations = await Highlight.findAll({
            where: { userId, type: { [Op.ne]: 'bookmark' } },
            order: [['createdAt', 'DESC']],
            include: [
                {
                    model: Book,
                    as: 'book',
                    attributes: ['id', 'title', 'coverUrl', 'format', 'author']
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

        // Agrupar por libro
        const annotationsByBook: { [bookId: string]: any } = {};
        
        annotations.forEach((anno: any) => {
            const bookId = anno.bookId;
            if (!annotationsByBook[bookId]) {
                annotationsByBook[bookId] = {
                    book: anno.book,
                    annotations: []
                };
            }
            annotationsByBook[bookId].annotations.push({
                id: anno.id,
                text: anno.text,
                type: anno.type,
                style: anno.style,
                color: anno.color,
                rectangles: anno.rectangles,
                startIndex: anno.startIndex,
                endIndex: anno.endIndex,
                isPublic: anno.isPublic,
                createdAt: anno.createdAt,
                sectionIndex: anno.section?.sectionIndex || 1,
                comments: anno.comments || []
            });
        });

        const result = Object.values(annotationsByBook);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener anotaciones', error: (error as any).message });
    }
};
