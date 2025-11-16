"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
require("reflect-metadata");
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const morgan_1 = __importDefault(require("morgan"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const database_1 = require("./config/database");
const container_1 = require("./config/container");
const express_config_1 = require("./config/express.config");
const socket_config_1 = require("./config/socket.config");
const routes_config_1 = require("./config/routes.config");
const swagger_config_1 = require("./config/swagger.config");
const requestLogger_1 = require("./middleware/requestLogger");
const rateLimiting_1 = require("./middleware/rateLimiting");
const errorHandler_1 = require("./middleware/errorHandler");
const csrf_1 = require("./middleware/csrf");
const metrics_1 = require("./middleware/metrics");
const tenantMiddleware_1 = require("./middleware/tenantMiddleware");
const logger_1 = require("./utils/logger");
const config_1 = require("./utils/config");
const scheduledBackupService_1 = __importDefault(require("./services/scheduledBackupService"));
const performanceController_1 = require("./controllers/performanceController");
const appLogger = (0, logger_1.createLogger)('default');
const backupLogger = (0, logger_1.createLogger)('backup');
try {
    (0, config_1.validateProductionConfig)();
    appLogger.info('Configuration validation passed');
}
catch (error) {
    appLogger.error('Configuration validation failed', { error: error.message });
    process.exit(1);
}
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const PORT = parseInt(process.env.PORT || '3000', 10);
(0, container_1.setupContainer)();
(0, metrics_1.initMetrics)();
const scheduledBackupService = new scheduledBackupService_1.default(database_1.prisma);
const allowedOrigins = (0, express_config_1.parseAllowedOrigins)();
appLogger.info(`Allowed origins: ${allowedOrigins.join(', ') || 'none (development mode)'}`);
(0, express_config_1.configureMiddleware)(app, allowedOrigins);
app.use((0, morgan_1.default)('combined'));
app.use((0, cookie_parser_1.default)());
app.use(requestLogger_1.requestLogging);
const uploadDirs = ['uploads/users', 'uploads/emcee', 'uploads/theme', 'uploads/bios'];
uploadDirs.forEach(dir => {
    const fullPath = path_1.default.join(__dirname, '..', dir);
    if (!fs_1.default.existsSync(fullPath)) {
        fs_1.default.mkdirSync(fullPath, { recursive: true });
        appLogger.info(`Created upload directory: ${dir}`);
    }
});
app.use('/api/auth/', rateLimiting_1.authLimiter);
app.use('/api/', rateLimiting_1.generalLimiter);
app.use('/api/', performanceController_1.logPerformance);
app.use('/api/', metrics_1.metricsMiddleware);
app.get('/metrics', metrics_1.metricsEndpoint);
app.get('/health', async (_req, res) => {
    try {
        const dbHealthy = await (0, database_1.testDatabaseConnection)();
        res.json({
            status: dbHealthy ? 'OK' : 'DEGRADED',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: dbHealthy ? 'connected' : 'disconnected',
        });
    }
    catch (error) {
        res.status(503).json({
            status: 'ERROR',
            timestamp: new Date().toISOString(),
            error: error.message,
        });
    }
});
app.get('/api/csrf-token', csrf_1.getCsrfToken);
if (process.env.ENABLE_API_DOCS !== 'false') {
    app.use('/api-docs', swagger_ui_express_1.default.serve);
    app.get('/api-docs', swagger_ui_express_1.default.setup(swagger_config_1.swaggerSpec, swagger_config_1.swaggerUiOptions));
    app.get('/api-docs.json', (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swagger_config_1.swaggerSpec);
    });
    appLogger.info('Swagger UI available at /api-docs');
}
else {
    appLogger.info('Swagger UI disabled (ENABLE_API_DOCS=false)');
}
app.use('/api', tenantMiddleware_1.tenantMiddleware);
app.use('/api', (req, res, next) => {
    if (process.env.NODE_ENV === 'test') {
        return next();
    }
    const method = req.method.toUpperCase();
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        return (0, csrf_1.csrfProtection)(req, res, next);
    }
    return next();
});
(0, routes_config_1.registerRoutes)(app);
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads'), {
    dotfiles: 'deny',
    index: false,
    setHeaders: (res, filePath) => {
        if (filePath.match(/.(jpg|jpeg|png|gif|webp)$/i)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000');
        }
        else {
            res.setHeader('Cache-Control', 'public, max-age=3600');
        }
        res.setHeader('X-Content-Type-Options', 'nosniff');
    }
}));
const io = (0, socket_config_1.createSocketServer)(server, allowedOrigins);
exports.io = io;
(0, socket_config_1.configureSocketHandlers)(io);
const frontendDistPath = path_1.default.join(__dirname, '../frontend/dist');
const frontendDistExists = fs_1.default.existsSync(frontendDistPath);
if (frontendDistExists) {
    app.use(express_1.default.static(frontendDistPath, {
        maxAge: process.env.NODE_ENV === 'production' ? '1y' : '0',
        etag: true,
        lastModified: true,
    }));
    appLogger.info('Frontend static files serving enabled');
}
else {
    appLogger.warn('Frontend dist directory not found. Frontend will not be served.');
    appLogger.warn('To build frontend: cd frontend && npm run build');
}
if (frontendDistExists) {
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api/') ||
            req.path.startsWith('/metrics') ||
            req.path.startsWith('/health') ||
            req.path.startsWith('/uploads') ||
            req.path.startsWith('/socket.io') ||
            req.path.startsWith('/api-docs')) {
            return next();
        }
        const indexPath = path_1.default.join(frontendDistPath, 'index.html');
        if (fs_1.default.existsSync(indexPath)) {
            res.sendFile(indexPath);
        }
        else {
            next();
        }
    });
}
app.use(csrf_1.csrfErrorHandler);
app.use(requestLogger_1.errorLogging);
app.use(errorHandler_1.errorHandler);
const startServer = async () => {
    if (process.env.NODE_ENV === 'test') {
        return;
    }
    try {
        const dbConnected = await (0, database_1.testDatabaseConnection)();
        if (!dbConnected) {
            appLogger.error('Failed to connect to database');
            process.exit(1);
        }
        server.listen(PORT, () => {
            appLogger.info(`🚀 Event Manager API server running on port ${PORT}`);
            appLogger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
            appLogger.info(`🔒 CORS: ${allowedOrigins.length > 0 ? 'configured' : 'open (dev mode)'}`);
        });
        if (process.env.NODE_ENV !== 'test') {
            try {
                await scheduledBackupService.start();
                backupLogger.info('Scheduled backup service started');
            }
            catch (error) {
                backupLogger.error('Failed to start scheduled backup service', { error: error.message });
            }
        }
    }
    catch (error) {
        appLogger.error('Failed to start server', { error: error.message });
        process.exit(1);
    }
};
const gracefulShutdown = async (signal) => {
    appLogger.info(`${signal} received, shutting down gracefully...`);
    try {
        server.close(() => {
            appLogger.info('HTTP server closed');
        });
        await scheduledBackupService.stop();
        backupLogger.info('Scheduled backup service stopped');
        await (0, database_1.disconnectDatabase)();
        io.close(() => {
            appLogger.info('Socket.IO closed');
        });
        appLogger.info('Graceful shutdown complete');
        process.exit(0);
    }
    catch (error) {
        appLogger.error('Error during graceful shutdown', { error: error.message });
        process.exit(1);
    }
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (error) => {
    appLogger.error('Uncaught Exception', {
        error: error.message,
        stack: error.stack,
    });
    gracefulShutdown('uncaughtException');
});
process.on('unhandledRejection', (reason) => {
    appLogger.error('Unhandled Rejection', {
        reason: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
    });
    gracefulShutdown('unhandledRejection');
});
if (process.env.NODE_ENV !== 'test') {
    startServer();
}
exports.default = app;
//# sourceMappingURL=server.js.map