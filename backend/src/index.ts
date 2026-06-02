import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/authRoutes';
import friendRoutes from './routes/friendRoutes';
import bookRoutes from './routes/bookRoutes';
import notificationRoutes from './routes/notificationRoutes';
import tagRoutes from './routes/tagRoutes';
import listRoutes from './routes/listRoutes';
import userRoutes from './routes/userRoutes';
import { setupSockets } from './socketManager';

dotenv.config();

const app = express();
const httpServer = createServer(app);
export const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
});

import { initDB, sequelize } from './config/database';
import Tag from './models/Tag';
import Favorite from './models/Favorite';
import CustomList from './models/CustomList';
import ListBook from './models/ListBook';
import BookComment from './models/BookComment';
import BookCommentReaction from './models/BookCommentReaction';

const startServer = async () => {
    try {
        await initDB();
        
        // Sincronizar modelos con la base de datos (Crea las tablas si no existen)
        await sequelize.sync();
        console.log('Tablas sincronizadas correctamente en MySQL');

        // Seed default tags
        await Tag.findOrCreate({ where: { name: 'Programación' } });

    } catch (err) {
        console.error('Error al inicializar la base de datos:', err);
    }
};
startServer();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/lists', listRoutes);
app.use('/api/users', userRoutes);

// Servir archivos estáticos del frontend (build de React/Vite)
const frontendPath = path.join(__dirname, '../public');
app.use(express.static(frontendPath));

// Catch-all: cualquier ruta que no sea /api ni /uploads devuelve index.html (SPA)
app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

setupSockets(io);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
    console.log(`Servidor de node corriendo en puerto ${PORT}`);
});
