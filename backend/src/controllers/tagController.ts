// @ts-nocheck
import { Request, Response } from 'express';
import Tag from '../models/Tag';

export const getAllTags = async (req: Request, res: Response): Promise<void> => {
    try {
        const tags = await Tag.findAll({
            order: [['name', 'ASC']]
        });
        res.status(200).json(tags);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener etiquetas', error: (error as any).message });
    }
};

export const createTag = async (req: Request, res: Response): Promise<void> => {
    try {
        const authReq = req as any;
        if (authReq.user?.role !== 'admin') {
            res.status(403).json({ message: 'Acceso denegado' });
            return;
        }

        const { name } = req.body;
        if (!name) {
            res.status(400).json({ message: 'El nombre de la etiqueta es requerido' });
            return;
        }

        const tag = await Tag.create({ name });
        res.status(201).json(tag);
    } catch (error) {
        res.status(500).json({ message: 'Error al crear la etiqueta', error: (error as any).message });
    }
};

export const updateTag = async (req: Request, res: Response): Promise<void> => {
    try {
        const authReq = req as any;
        if (authReq.user?.role !== 'admin') {
            res.status(403).json({ message: 'Acceso denegado' });
            return;
        }

        const { id } = req.params;
        const { name } = req.body;

        const tag = await Tag.findByPk(id as string);
        if (!tag) {
            res.status(404).json({ message: 'Etiqueta no encontrada' });
            return;
        }

        tag.name = name;
        await tag.save();

        res.status(200).json(tag);
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar la etiqueta', error: (error as any).message });
    }
};

export const deleteTag = async (req: Request, res: Response): Promise<void> => {
    try {
        const authReq = req as any;
        if (authReq.user?.role !== 'admin') {
            res.status(403).json({ message: 'Acceso denegado' });
            return;
        }

        const { id } = req.params;
        
        const tag = await Tag.findByPk(id as string);
        if (!tag) {
            res.status(404).json({ message: 'Etiqueta no encontrada' });
            return;
        }

        await tag.destroy();
        res.status(200).json({ message: 'Etiqueta eliminada con éxito' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar la etiqueta', error: (error as any).message });
    }
};
