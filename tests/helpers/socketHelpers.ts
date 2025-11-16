/**
 * Socket.IO Test Helpers
 * Helpers for testing real-time features with Socket.IO
 */

import { Server as SocketIOServer, Socket as SocketIOSocket } from 'socket.io';
import { io as ClientIO, Socket as ClientSocket } from 'socket.io-client';
import { createServer, Server as HTTPServer } from 'http';

/**
 * Create test Socket.IO server
 */
export const createTestSocketServer = (httpServer?: HTTPServer): SocketIOServer => {
  const server = httpServer || createServer();
  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });
  return io;
};

/**
 * Create test Socket.IO client
 */
export const createTestSocketClient = (
  port: number = 3000,
  path: string = '/socket.io',
  token?: string
): ClientSocket => {
  const socketUrl = `http://localhost:${port}`;
  const options: any = {
    path,
    transports: ['websocket'],
    forceNew: true,
  };

  if (token) {
    options.auth = { token };
  }

  return ClientIO(socketUrl, options);
};

/**
 * Wait for socket connection
 */
export const waitForSocketConnection = (socket: ClientSocket, timeout: number = 5000): Promise<void> => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Socket connection timeout'));
    }, timeout);

    socket.on('connect', () => {
      clearTimeout(timeoutId);
      resolve();
    });

    socket.on('connect_error', (error) => {
      clearTimeout(timeoutId);
      reject(error);
    });
  });
};

/**
 * Wait for socket event
 */
export const waitForSocketEvent = <T = any>(
  socket: ClientSocket,
  event: string,
  timeout: number = 5000
): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Socket event '${event}' timeout`));
    }, timeout);

    socket.once(event, (data: T) => {
      clearTimeout(timeoutId);
      resolve(data);
    });
  });
};

/**
 * Mock socket for server-side testing
 */
export const mockSocket = (overrides: any = {}): Partial<SocketIOSocket> => {
  return {
    id: 'mock-socket-id',
    emit: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    off: jest.fn(),
    join: jest.fn(),
    leave: jest.fn(),
    disconnect: jest.fn(),
    data: {},
    handshake: {
      auth: {},
      headers: {},
      query: {},
      issued: Date.now(),
      secure: false,
      time: new Date().toString(),
      address: '127.0.0.1',
      xdomain: false,
      url: '/socket.io',
    },
    ...overrides,
  } as any;
};

/**
 * Mock authenticated socket
 */
export const mockAuthSocket = (userId: string, role: string = 'ADMIN'): Partial<SocketIOSocket> => {
  return mockSocket({
    data: {
      userId,
      role,
    },
    handshake: {
      auth: {
        token: `mock-token-for-${userId}`,
      },
      headers: {
        authorization: `Bearer mock-token-for-${userId}`,
      },
      query: {},
      issued: Date.now(),
      secure: false,
      time: new Date().toString(),
      address: '127.0.0.1',
      xdomain: false,
      url: '/socket.io',
    },
  });
};

/**
 * Emit and wait for acknowledgment
 */
export const emitWithAck = <T = any>(
  socket: ClientSocket,
  event: string,
  data: any,
  timeout: number = 5000
): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Socket acknowledgment timeout for event '${event}'`));
    }, timeout);

    socket.emit(event, data, (response: T) => {
      clearTimeout(timeoutId);
      resolve(response);
    });
  });
};

/**
 * Cleanup socket connections
 */
export const cleanupSockets = (sockets: ClientSocket[]) => {
  sockets.forEach(socket => {
    if (socket.connected) {
      socket.disconnect();
    }
  });
};

/**
 * Create multiple test clients
 */
export const createMultipleTestClients = (
  count: number,
  port: number = 3000,
  tokens?: string[]
): ClientSocket[] => {
  const clients: ClientSocket[] = [];
  for (let i = 0; i < count; i++) {
    const token = tokens?.[i];
    clients.push(createTestSocketClient(port, '/socket.io', token));
  }
  return clients;
};

/**
 * Assert socket event was emitted
 */
export const assertSocketEmit = (mockSocket: any, event: string, times: number = 1) => {
  expect(mockSocket.emit).toHaveBeenCalledWith(
    expect.stringContaining(event),
    expect.anything()
  );
  if (times > 0) {
    expect(mockSocket.emit).toHaveBeenCalledTimes(times);
  }
};

/**
 * Socket event spy helper
 */
export const spyOnSocketEvent = (socket: ClientSocket, event: string): Promise<any[]> => {
  const calls: any[] = [];

  return new Promise((resolve) => {
    socket.on(event, (data) => {
      calls.push(data);
    });

    // Resolve with collected calls after a delay
    setTimeout(() => {
      resolve(calls);
    }, 100);
  });
};

/**
 * Test notification payload
 */
export const createTestNotification = (overrides: any = {}) => {
  return {
    id: 'notification-123',
    type: 'INFO',
    message: 'Test notification',
    timestamp: new Date(),
    userId: 'user-123',
    read: false,
    ...overrides,
  };
};

/**
 * Test real-time update payload
 */
export const createTestUpdate = (entity: string, action: string, data: any) => {
  return {
    entity,
    action,
    data,
    timestamp: new Date(),
  };
};
