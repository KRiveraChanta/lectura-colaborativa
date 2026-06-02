import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { AuthRequest } from '../middleware/auth';
import Friendship from '../models/Friendship';
import User from '../models/User';
import Notification from '../models/Notification';
import { io } from '../index';
import { onlineUsers } from '../socketManager';

export const sendFriendRequest = async (req: Request, res: Response): Promise<void> => {
    try {
        const authReq = req as AuthRequest;
        const { recipientId } = req.body;
        const requesterId = authReq.user!.id;

        if (requesterId === recipientId) {
            res.status(400).json({ message: 'No puedes enviarte una solicitud a ti mismo' });
            return;
        }

        const checkExisting = await Friendship.findOne({
            where: {
                [Op.or]: [
                    { requesterId: requesterId, recipientId: recipientId },
                    { requesterId: recipientId, recipientId: requesterId }
                ]
            }
        });

        if (checkExisting) {
            res.status(400).json({ message: 'La solicitud ya existe o ya son amigos' });
            return;
        }

        const friendship = await Friendship.create({ requesterId, recipientId });

        const notification = await Notification.create({
            userId: recipientId,
            senderId: requesterId,
            type: 'friend_request',
            message: `${authReq.user!.username} te ha enviado una solicitud de amistad.`,
            relatedId: friendship.id
        });

        const socketId = onlineUsers.get(recipientId);
        if (socketId) {
            io.to(socketId).emit('new_notification', notification);
        }

        res.status(201).json({ message: 'Solicitud enviada exitosamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: (error as any).message });
    }
};

export const acceptFriendRequest = async (req: Request, res: Response): Promise<void> => {
    try {
        const authReq = req as AuthRequest;
        const { requestId } = req.params;
        const userId = authReq.user!.id;

        const request = await Friendship.findOne({
            where: {
                id: requestId,
                recipientId: userId,
                status: 'pending'
            }
        });

        if (!request) {
            res.status(404).json({ message: 'Solicitud no encontrada' });
            return;
        }

        request.status = 'accepted';
        await request.save();

        const notification = await Notification.create({
            userId: request.requesterId,
            senderId: userId,
            type: 'friend_request',
            message: `${authReq.user!.username} ha aceptado tu solicitud de amistad.`,
            relatedId: request.id
        });

        const socketId = onlineUsers.get(request.requesterId);
        if (socketId) {
            io.to(socketId).emit('new_notification', notification);
        }

        res.status(200).json({ message: 'Solicitud de amistad aceptada' });
    } catch (error) {
        res.status(500).json({ message: 'Error', error: (error as any).message });
    }
};

export const getFriendsList = async (req: Request, res: Response): Promise<void> => {
    try {
        const authReq = req as AuthRequest;
        const userId = authReq.user!.id;

        const friends = await Friendship.findAll({
            where: {
                [Op.or]: [{ requesterId: userId }, { recipientId: userId }],
                status: 'accepted'
            },
            include: [
                { model: User, as: 'requester', attributes: ['id', 'username', 'avatarUrl'] },
                { model: User, as: 'recipient', attributes: ['id', 'username', 'avatarUrl'] }
            ]
        });

        const formattedFriends = friends.map(f => {
            const friendship = f.toJSON() as any;
            const isRequester = friendship.requesterId === userId;
            return isRequester ? friendship.recipient : friendship.requester;
        });

        res.status(200).json(formattedFriends);
    } catch (error) {
        res.status(500).json({ message: 'Error', error: (error as any).message });
    }
};

export const rejectFriendRequest = async (req: Request, res: Response): Promise<void> => {
    try {
        const authReq = req as AuthRequest;
        const { requestId } = req.params;
        const userId = authReq.user!.id;

        const request = await Friendship.findOne({
            where: {
                id: requestId,
                recipientId: userId,
                status: 'pending'
            }
        });

        if (!request) {
            res.status(404).json({ message: 'Solicitud no encontrada' });
            return;
        }

        request.status = 'rejected';
        await request.save();

        res.status(200).json({ message: 'Solicitud de amistad rechazada' });
    } catch (error) {
        res.status(500).json({ message: 'Error', error: (error as any).message });
    }
};

export const getPendingRequests = async (req: Request, res: Response): Promise<void> => {
    try {
        const authReq = req as AuthRequest;
        const userId = authReq.user!.id;

        const requests = await Friendship.findAll({
            where: {
                recipientId: userId,
                status: 'pending'
            },
            include: [
                { model: User, as: 'requester', attributes: ['id', 'username', 'avatarUrl'] }
            ]
        });

        res.status(200).json(requests);
    } catch (error) {
        res.status(500).json({ message: 'Error', error: (error as any).message });
    }
};



export const removeFriend = async (req: Request, res: Response): Promise<void> => {
    try {
        const authReq = req as AuthRequest;
        const userId = authReq.user!.id;
        const { friendId } = req.params;

        const friendship = await Friendship.findOne({
            where: {
                [Op.or]: [
                    { requesterId: userId, recipientId: friendId },
                    { requesterId: friendId, recipientId: userId }
                ],
                status: 'accepted'
            }
        });

        if (!friendship) {
            res.status(404).json({ message: 'Amistad no encontrada' });
            return;
        }

        await friendship.destroy();

        res.status(200).json({ message: 'Amigo eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar amigo', error: (error as any).message });
    }
};
