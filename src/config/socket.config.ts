/**
 * Socket.IO Configuration
 */

import { Server as HttpServer } from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'
import { isAllowedOrigin } from './express.config'
import { container } from 'tsyringe'
import { NotificationService } from '../services/NotificationService'
import * as jwt from 'jsonwebtoken'
import { env } from './env';

/**
 * Create and configure Socket.IO server
 */
export const createSocketServer = (server: HttpServer, allowedOrigins: string[]): SocketIOServer => {
  const io = new SocketIOServer(server, {
    cors: {
      origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
        if (isAllowedOrigin(origin, allowedOrigins)) {
          return callback(null, true)
        }
        return callback(new Error('Not allowed by CORS'))
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // Extended timeouts to prevent disconnections
    pingTimeout: 60000, // 60 seconds - time to wait for pong response
    pingInterval: 25000, // 25 seconds - time between pings
    // Enable reconnection and upgrade
    transports: ['websocket', 'polling'],
    allowUpgrades: true,
    // Increase buffer size for large payloads
    maxHttpBufferSize: 1e8, // 100MB
    // Additional stability settings
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
      skipMiddlewares: true,
    },
  })

  return io
}

/**
 * Configure Socket.IO event handlers
 */
export const configureSocketHandlers = (io: SocketIOServer): void => {
  // Set Socket.IO instance on NotificationService for real-time notifications
  try {
    const notificationService = container.resolve(NotificationService)
    notificationService.setSocketIO(io)
    console.log('✓ NotificationService configured with Socket.IO')
  } catch (error) {
    console.error('Failed to configure NotificationService with Socket.IO:', error)
  }

  // Middleware to authenticate socket connections
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth['token'] || socket.handshake.headers.authorization?.replace('Bearer ', '')

    if (!token) {
      return next(new Error('Authentication error: No token provided'))
    }

    try {
      const decoded = jwt.verify(token, env.get('JWT_SECRET')) as { userId: string; tenantId: string }
      ;(socket as any).userId = decoded.userId
      ;(socket as any).tenantId = decoded.tenantId
      next()
    } catch (error) {
      next(new Error('Authentication error: Invalid token'))
    }
  })

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId
    const tenantId = (socket as any).tenantId
    console.log(`Client connected: ${socket.id} (User: ${userId})`)

    // Automatically join user-specific room
    if (userId) {
      socket.join(`user:${userId}`)
      console.log(`Socket ${socket.id} auto-joined room: user:${userId}`)
    }

    socket.on('disconnect', (reason: string) => {
      console.log(`Client disconnected: ${socket.id}, reason: ${reason}`)
    })

    socket.on('error', (error: Error) => {
      console.error(`Socket error for ${socket.id}:`, error)
    })

    // Room management (legacy support)
    socket.on('join-room', (room: string) => {
      socket.join(room)
      console.log(`Socket ${socket.id} joined room: ${room}`)
    })

    socket.on('leave-room', (room: string) => {
      socket.leave(room)
      console.log(`Socket ${socket.id} left room: ${room}`)
    })

    // Notification-specific events
    socket.on('mark-notification-read', async (notificationId: string) => {
      try {
        const notificationService = container.resolve(NotificationService)
        await notificationService.markAsRead(notificationId, userId, tenantId)
      } catch (error) {
        console.error('Error marking notification as read:', error)
        socket.emit('notification:error', { message: 'Failed to mark notification as read' })
      }
    })
  })
}
