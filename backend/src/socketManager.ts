import { Server, Socket } from 'socket.io';

export const onlineUsers = new Map<string, string>(); // userId -> socketId

export const setupSockets = (io: Server) => {
    io.on('connection', (socket: Socket) => {
        console.log('Cliente Socket interactuando:', socket.id);

        socket.on('user_connected', (userId: string) => {
            if (userId) {
                onlineUsers.set(userId, socket.id);
                // Assign socket property to identify on disconnect
                (socket as any).userId = userId;
                
                // Broadcast that this user is online
                io.emit('user_online', userId);
                
                // Send the list of currently online users to the newly connected user
                const onlineUsersList = Array.from(onlineUsers.keys());
                socket.emit('online_users_list', onlineUsersList);
            }
        });

        socket.on('join_book', ({ bookId, userId }) => {
            socket.join(bookId);
            console.log(`Usuario ${userId} ha entrado al libro ${bookId}`);
            // Notify others in room
            socket.to(bookId).emit('user_joined', { userId });
        });

        socket.on('leave_book', ({ bookId, userId }) => {
            socket.leave(bookId);
            socket.to(bookId).emit('user_left', { userId });
        });

        socket.on('new_highlight', (data) => {
            // data: highlight Object
            socket.to(data.bookId).emit('highlight_received', data);
        });

        socket.on('new_comment', (data) => {
            socket.to(data.bookId).emit('comment_received', data);
        });

        socket.on('highlight_deleted', (data) => {
            socket.to(data.bookId).emit('highlight_deleted_broadcast', data);
        });

        socket.on('update_progress', (data) => {
            // Broadcast user progress to other readers looking at the dashboard/book
            socket.to(data.bookId).emit('progress_updated', data);
        });

        socket.on('disconnect', () => {
            console.log('Cliente Socket se ha desconectado:', socket.id);
            const userId = (socket as any).userId;
            if (userId) {
                onlineUsers.delete(userId);
                io.emit('user_offline', userId);
            }
        });
    });
};
