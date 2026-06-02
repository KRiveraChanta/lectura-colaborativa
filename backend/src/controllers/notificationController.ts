import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Notification from '../models/Notification';
import User from '../models/User';

export const getNotifications = async (req: Request, res: Response): Promise<void> => {
    try {
        const authReq = req as AuthRequest;
        const userId = authReq.user!.id;

        const notifications = await Notification.findAll({
            where: { userId },
            order: [['createdAt', 'DESC']],
            include: [
                { model: User, as: 'sender', attributes: ['id', 'username', 'avatarUrl'] }
            ]
        });

        res.status(200).json(notifications);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener notificaciones', error: (error as any).message });
    }
};

export const markAsRead = async (req: Request, res: Response): Promise<void> => {
    try {
        const authReq = req as AuthRequest;
        const userId = authReq.user!.id;
        const { id } = req.params;

        const notification = await Notification.findOne({
            where: { id, userId }
        });

        if (!notification) {
            res.status(404).json({ message: 'Notificación no encontrada' });
            return;
        }

        notification.read = true;
        await notification.save();

        res.status(200).json({ message: 'Notificación leída', notification });
    } catch (error) {
        res.status(500).json({ message: 'Error al marcar como leída', error: (error as any).message });
    }
};

export const markAllAsRead = async (req: Request, res: Response): Promise<void> => {
    try {
        const authReq = req as AuthRequest;
        const userId = authReq.user!.id;

        await Notification.update(
            { read: true },
            { where: { userId, read: false } }
        );

        res.status(200).json({ message: 'Todas las notificaciones marcadas como leídas' });
    } catch (error) {
        res.status(500).json({ message: 'Error al marcar como leídas', error: (error as any).message });
    }
};
