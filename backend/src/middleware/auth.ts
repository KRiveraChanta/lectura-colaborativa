import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_proyectito_123';

export interface AuthRequest extends Request {
    user?: { id: string; username: string; role?: string };
}

export const authenticateJWT = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];

        jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
            if (err) {
                res.status(403).json({ message: 'Token inválido o expirado' });
                return;
            }
            req.user = user as { id: string; username: string; role?: string };
            next();
        });
    } else {
        res.status(401).json({ message: 'Autorización requerida' });
    }
};

export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];

        jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
            if (!err && user) {
                req.user = user as { id: string; username: string; role?: string };
            }
            next();
        });
    } else {
        next();
    }
};
