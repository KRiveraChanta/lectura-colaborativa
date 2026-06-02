import { Request, Response } from 'express';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';

export const getAllUsers = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (req.user?.role !== 'admin') {
            res.status(403).json({ message: 'Acceso denegado' });
            return;
        }

        const users = await User.findAll({
            attributes: ['id', 'username', 'email', 'avatarUrl', 'role', 'createdAt', 'updatedAt'],
            order: [['createdAt', 'DESC']]
        });

        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Error al obtener usuarios', error: (error as any).message });
    }
};

export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (req.user?.role !== 'admin') {
            res.status(403).json({ message: 'Acceso denegado' });
            return;
        }

        const { id } = req.params;
        const { role } = req.body;

        const user = await User.findByPk(id);
        if (!user) {
            res.status(404).json({ message: 'Usuario no encontrado' });
            return;
        }

        // Prevenir que el admin se quite su propio rol accidentalmente si es el único
        if (user.id === req.user.id && role !== 'admin') {
            res.status(400).json({ message: 'No puedes quitarte tu propio rol de administrador' });
            return;
        }

        user.role = role || user.role;
        await user.save();

        res.json({ message: 'Usuario actualizado correctamente', user: { id: user.id, username: user.username, role: user.role } });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Error al actualizar usuario', error: (error as any).message });
    }
};

export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (req.user?.role !== 'admin') {
            res.status(403).json({ message: 'Acceso denegado' });
            return;
        }

        const { id } = req.params;

        const user = await User.findByPk(id);
        if (!user) {
            res.status(404).json({ message: 'Usuario no encontrado' });
            return;
        }

        if (user.id === req.user.id) {
            res.status(400).json({ message: 'No puedes eliminarte a ti mismo' });
            return;
        }

        await user.destroy();

        res.json({ message: 'Usuario eliminado permanentemente' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Error al eliminar usuario', error: (error as any).message });
    }
};
