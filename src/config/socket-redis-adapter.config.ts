/**
 * Socket.IO Redis Adapter Configuration
 *
 * Enables Socket.IO to work across multiple server instances (horizontal scaling)
 * by using Redis as a message broker between processes.
 *
 * Benefits:
 * - Multiple server instances can share socket connections
 * - Room management works across all instances
 * - Broadcasts reach all connected clients regardless of server
 * - Enables PM2 cluster mode and Kubernetes horizontal pod autoscaling
 *
 * Installation:
 * npm install socket.io-redis @socket.io/redis-adapter
 *
 * Usage in server.ts:
 * ```typescript
 * import { setupRedisAdapter } from './config/socket-redis-adapter.config';
 *
 * const io = createSocketServer(server, allowedOrigins);
 * await setupRedisAdapter(io); // Add this line
 * configureSocketHandlers(io);
 * ```
 */

import { Server as SocketIOServer } from 'socket.io';
import { createClient } from 'redis';
import { logger } from '../utils/logger';
import { env } from './env';

/**
 * Redis clients for Socket.IO adapter
 */
let pubClient: ReturnType<typeof createClient>;
let subClient: ReturnType<typeof createClient>;

/**
 * Setup Redis adapter for Socket.IO clustering
 */
export async function setupRedisAdapter(io: SocketIOServer): Promise<void> {
  try {
    const redisUrl = env.get('REDIS_URL');
    // Note: SOCKET_IO_CLUSTERING_ENABLED not in env.ts yet
    // TODO: Add SOCKET_IO_CLUSTERING_ENABLED to env.ts configuration
    const enableClustering = process.env['SOCKET_IO_CLUSTERING_ENABLED'] === 'true';

    if (!enableClustering) {
      logger.info('Socket.IO clustering disabled (SOCKET_IO_CLUSTERING_ENABLED !== true)');
      return;
    }

    logger.info('Setting up Socket.IO Redis adapter for clustering...');

    // Create pub/sub clients
    pubClient = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis pub client: Max reconnection attempts reached');
            return new Error('Max reconnection attempts reached');
          }
          const delay = Math.min(retries * 100, 3000);
          logger.warn(`Redis pub client reconnecting in ${delay}ms...`);
          return delay;
        }
      }
    });

    subClient = pubClient.duplicate();

    // Error handling
    pubClient.on('error', (err) => {
      logger.error('Redis pub client error:', err);
    });

    subClient.on('error', (err) => {
      logger.error('Redis sub client error:', err);
    });

    // Connect clients
    await Promise.all([
      pubClient.connect(),
      subClient.connect()
    ]);

    logger.info('✓ Redis pub/sub clients connected');

    // Dynamically import adapter (package may not be installed)
    try {
      // Use dynamic require to avoid compile-time error if package not installed
      // @ts-ignore - Package is optional and loaded dynamically
      const { createAdapter } = require('@socket.io/redis-adapter');

      const adapter = createAdapter(pubClient, subClient, {
        // Optional: customize the key prefix
        key: 'socket.io',

        // Optional: enable request/response mode for ACKs across servers
        requestsTimeout: 5000
      });

      io.adapter(adapter);

      logger.info('✓ Socket.IO Redis adapter configured for clustering');

      // Log adapter events for debugging
      adapter.on('error', (err: Error) => {
        logger.error('Socket.IO adapter error:', err);
      });
    } catch (importError) {
      logger.error('@socket.io/redis-adapter not installed. Install with: npm install @socket.io/redis-adapter');
      logger.warn('Socket.IO will run in single-instance mode');
      throw new Error('Socket.IO Redis adapter not available. Install @socket.io/redis-adapter package.');
    }

  } catch (error) {
    logger.error('Failed to setup Socket.IO Redis adapter:', error);
    logger.warn('Socket.IO will run in single-instance mode');
    throw error;
  }
}

/**
 * Cleanup Redis adapter connections
 */
export async function closeRedisAdapter(): Promise<void> {
  try {
    if (pubClient) {
      await pubClient.quit();
      logger.info('Redis pub client closed');
    }
    if (subClient) {
      await subClient.quit();
      logger.info('Redis sub client closed');
    }
  } catch (error) {
    logger.error('Error closing Redis adapter clients:', error);
  }
}

/**
 * Get adapter statistics
 */
export async function getAdapterStats(): Promise<{
  serverCount: number;
  clientCount: number;
  rooms: number;
}> {
  try {
    const sockets = await pubClient.get('socket.io#sockets');
    const rooms = await pubClient.get('socket.io#rooms');

    return {
      serverCount: 1, // This would need to be tracked separately
      clientCount: sockets ? JSON.parse(sockets).length : 0,
      rooms: rooms ? JSON.parse(rooms).length : 0
    };
  } catch (error) {
    logger.error('Error getting adapter stats:', error);
    return { serverCount: 0, clientCount: 0, rooms: 0 };
  }
}

/**
 * Test adapter connectivity
 */
export async function testAdapterConnectivity(): Promise<boolean> {
  try {
    if (!pubClient || !subClient) {
      return false;
    }

    await Promise.all([
      pubClient.ping(),
      subClient.ping()
    ]);

    return true;
  } catch (error) {
    logger.error('Adapter connectivity test failed:', error);
    return false;
  }
}

/**
 * Example deployment scenarios:
 *
 * ## PM2 Cluster Mode
 * ```javascript
 * // ecosystem.config.js
 * module.exports = {
 *   apps: [{
 *     name: 'event-manager-api',
 *     script: './dist/server.js',
 *     instances: 4, // or 'max' for CPU count
 *     exec_mode: 'cluster',
 *     env: {
 *       NODE_ENV: 'production',
 *       SOCKET_IO_CLUSTERING_ENABLED: 'true',
 *       REDIS_URL: 'redis://localhost:6379'
 *     }
 *   }]
 * };
 * ```
 *
 * ## Kubernetes Horizontal Pod Autoscaler
 * ```yaml
 * apiVersion: apps/v1
 * kind: Deployment
 * metadata:
 *   name: event-manager-api
 * spec:
 *   replicas: 3  # Multiple pods
 *   template:
 *     spec:
 *       containers:
 *       - name: api
 *         env:
 *         - name: SOCKET_IO_CLUSTERING_ENABLED
 *           value: "true"
 *         - name: REDIS_URL
 *           value: "redis://redis-service:6379"
 * ---
 * apiVersion: autoscaling/v2
 * kind: HorizontalPodAutoscaler
 * metadata:
 *   name: event-manager-api-hpa
 * spec:
 *   scaleTargetRef:
 *     apiVersion: apps/v1
 *     kind: Deployment
 *     name: event-manager-api
 *   minReplicas: 3
 *   maxReplicas: 10
 *   metrics:
 *   - type: Resource
 *     resource:
 *       name: cpu
 *       target:
 *         type: Utilization
 *         averageUtilization: 70
 * ```
 *
 * ## Docker Compose
 * ```yaml
 * version: '3.8'
 * services:
 *   api:
 *     image: event-manager-api
 *     deploy:
 *       replicas: 3  # Multiple instances
 *     environment:
 *       - SOCKET_IO_CLUSTERING_ENABLED=true
 *       - REDIS_URL=redis://redis:6379
 *     depends_on:
 *       - redis
 *
 *   redis:
 *     image: redis:7-alpine
 *     ports:
 *       - "6379:6379"
 * ```
 *
 * ## Testing Clustering
 * ```typescript
 * // Test script to verify clustering works
 * import io from 'socket.io-client';
 *
 * async function testClustering() {
 *   // Connect to different server instances
 *   const socket1 = io('http://localhost:3000');
 *   const socket2 = io('http://localhost:3001');
 *
 *   socket1.on('test-event', (data) => {
 *     console.log('Socket1 received:', data);
 *   });
 *
 *   socket2.on('test-event', (data) => {
 *     console.log('Socket2 received:', data);
 *   });
 *
 *   // Emit from server - both clients should receive
 *   // even if connected to different instances
 *   io.emit('test-event', { message: 'Hello from server' });
 * }
 * ```
 */

export default setupRedisAdapter;
