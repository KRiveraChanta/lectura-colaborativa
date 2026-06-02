// @ts-nocheck
import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import CustomList from '../models/CustomList';
import ListBook from '../models/ListBook';
import Book from '../models/Book';
import User from '../models/User';
import Favorite from '../models/Favorite';
import BookAccess from '../models/BookAccess';
import { Op } from 'sequelize';

export const createList = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, visibility } = req.body;
        const authReq = req as AuthRequest;
        const userId = authReq.user!.id;

        const list = await CustomList.create({
            name,
            visibility: visibility || 'private',
            userId
        });

        res.status(201).json(list);
    } catch (error) {
        res.status(500).json({ message: 'Error al crear lista', error: (error as any).message });
    }
};

export const getMyLists = async (req: Request, res: Response): Promise<void> => {
    try {
        const authReq = req as AuthRequest;
        const userId = authReq.user!.id;

        const lists = await CustomList.findAll({
            where: { userId },
            include: [{
                model: Book,
                as: 'books',
                attributes: ['id', 'title', 'coverUrl', 'creatorId', 'visibility']
            }]
        });

        res.status(200).json(lists);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener listas', error: (error as any).message });
    }
};

export const getPublicLists = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.params;
        const lists = await CustomList.findAll({
            where: { userId, visibility: 'public' },
            include: [{
                model: Book,
                as: 'books',
                attributes: ['id', 'title', 'coverUrl', 'creatorId', 'visibility']
            }]
        });

        res.status(200).json(lists);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener listas públicas', error: (error as any).message });
    }
};

export const updateList = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { name, visibility } = req.body;
        const authReq = req as AuthRequest;
        const userId = authReq.user!.id;

        const list = await CustomList.findOne({ where: { id, userId } });
        if (!list) {
            res.status(404).json({ message: 'Lista no encontrada' });
            return;
        }

        await list.update({
            name: name !== undefined ? name : list.name,
            visibility: visibility !== undefined ? visibility : (list as any).visibility
        });

        res.status(200).json(list);
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar lista', error: (error as any).message });
    }
};

export const deleteList = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const authReq = req as AuthRequest;
        const userId = authReq.user!.id;

        const list = await CustomList.findOne({ where: { id, userId } });
        if (!list) {
            res.status(404).json({ message: 'Lista no encontrada' });
            return;
        }

        await ListBook.destroy({ where: { listId: id } });
        await list.destroy();

        res.status(200).json({ message: 'Lista eliminada' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar lista', error: (error as any).message });
    }
};

export const addBookToList = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id, bookId } = req.params;
        const authReq = req as AuthRequest;
        const userId = authReq.user!.id;

        const list = await CustomList.findOne({ where: { id, userId } });
        if (!list) {
            res.status(404).json({ message: 'Lista no encontrada' });
            return;
        }

        const book = await Book.findByPk(bookId as string);
        if (!book) {
            res.status(404).json({ message: 'Libro no encontrado' });
            return;
        }

        await ListBook.findOrCreate({
            where: { listId: id, bookId }
        });

        res.status(200).json({ message: 'Libro añadido a la lista' });
    } catch (error) {
        res.status(500).json({ message: 'Error al añadir libro', error: (error as any).message });
    }
};

export const removeBookFromList = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id, bookId } = req.params;
        const authReq = req as AuthRequest;
        const userId = authReq.user!.id;

        const list = await CustomList.findOne({ where: { id, userId } });
        if (!list) {
            res.status(404).json({ message: 'Lista no encontrada' });
            return;
        }

        await ListBook.destroy({
            where: { listId: id, bookId }
        });

        res.status(200).json({ message: 'Libro removido de la lista' });
    } catch (error) {
        res.status(500).json({ message: 'Error al remover libro', error: (error as any).message });
    }
};
