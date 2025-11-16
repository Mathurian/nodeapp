import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
export declare const createSocketServer: (server: HttpServer, allowedOrigins: string[]) => SocketIOServer;
export declare const configureSocketHandlers: (io: SocketIOServer) => void;
//# sourceMappingURL=socket.config.d.ts.map