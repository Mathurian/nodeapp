"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureSocketHandlers = exports.createSocketServer = void 0;
const socket_io_1 = require("socket.io");
const express_config_1 = require("./express.config");
const tsyringe_1 = require("tsyringe");
const NotificationService_1 = require("../services/NotificationService");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const createSocketServer = (server, allowedOrigins) => {
    const io = new socket_io_1.Server(server, {
        cors: {
            origin: function (origin, callback) {
                if ((0, express_config_1.isAllowedOrigin)(origin, allowedOrigins)) {
                    return callback(null, true);
                }
                return callback(new Error('Not allowed by CORS'));
            },
            methods: ['GET', 'POST'],
            credentials: true,
        },
        pingTimeout: 60000,
        pingInterval: 25000,
        transports: ['websocket', 'polling'],
        allowUpgrades: true,
        maxHttpBufferSize: 1e8,
        connectionStateRecovery: {
            maxDisconnectionDuration: 2 * 60 * 1000,
            skipMiddlewares: true,
        },
    });
    return io;
};
exports.createSocketServer = createSocketServer;
const configureSocketHandlers = (io) => {
    try {
        const notificationService = tsyringe_1.container.resolve(NotificationService_1.NotificationService);
        notificationService.setSocketIO(io);
        console.log('✓ NotificationService configured with Socket.IO');
    }
    catch (error) {
        console.error('Failed to configure NotificationService with Socket.IO:', error);
    }
    io.use((socket, next) => {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return next(new Error('Authentication error: No token provided'));
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.userId;
            next();
        }
        catch (error) {
            next(new Error('Authentication error: Invalid token'));
        }
    });
    io.on('connection', (socket) => {
        const userId = socket.userId;
        console.log(`Client connected: ${socket.id} (User: ${userId})`);
        if (userId) {
            socket.join(`user:${userId}`);
            console.log(`Socket ${socket.id} auto-joined room: user:${userId}`);
        }
        socket.on('disconnect', (reason) => {
            console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
        });
        socket.on('error', (error) => {
            console.error(`Socket error for ${socket.id}:`, error);
        });
        socket.on('join-room', (room) => {
            socket.join(room);
            console.log(`Socket ${socket.id} joined room: ${room}`);
        });
        socket.on('leave-room', (room) => {
            socket.leave(room);
            console.log(`Socket ${socket.id} left room: ${room}`);
        });
        socket.on('mark-notification-read', async (notificationId) => {
            try {
                const notificationService = tsyringe_1.container.resolve(NotificationService_1.NotificationService);
                await notificationService.markAsRead(notificationId, userId);
            }
            catch (error) {
                console.error('Error marking notification as read:', error);
                socket.emit('notification:error', { message: 'Failed to mark notification as read' });
            }
        });
    });
};
exports.configureSocketHandlers = configureSocketHandlers;
//# sourceMappingURL=socket.config.js.map