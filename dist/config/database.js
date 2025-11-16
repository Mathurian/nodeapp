"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.testDatabaseConnection = testDatabaseConnection;
exports.getDatabasePoolStats = getDatabasePoolStats;
exports.disconnectDatabase = disconnectDatabase;
exports.checkDatabaseHealth = checkDatabaseHealth;
exports.executeInTransaction = executeInTransaction;
exports.batchExecute = batchExecute;
const client_1 = require("@prisma/client");
const prismaClientSingleton = () => {
    const client = new client_1.PrismaClient({
        log: process.env.NODE_ENV === 'development'
            ? ['query', 'info', 'warn', 'error']
            : ['error'],
        datasources: {
            db: {
                url: process.env.DATABASE_URL
            }
        },
    });
    return client;
};
exports.prisma = globalThis.prisma ?? prismaClientSingleton();
if (process.env.NODE_ENV !== 'production') {
    globalThis.prisma = exports.prisma;
}
async function testDatabaseConnection() {
    try {
        await exports.prisma.$queryRaw `SELECT 1`;
        console.log('✓ Database connection successful');
        return true;
    }
    catch (error) {
        console.error('✗ Database connection failed:', error);
        return false;
    }
}
async function getDatabasePoolStats() {
    try {
        const poolStats = await exports.prisma.$queryRaw `
      SELECT
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections
      FROM pg_stat_activity
      WHERE datname = current_database()
    `;
        return poolStats[0];
    }
    catch (error) {
        console.error('Error fetching pool stats:', error);
        return null;
    }
}
async function disconnectDatabase() {
    try {
        await exports.prisma.$disconnect();
        console.log('✓ Database disconnected gracefully');
    }
    catch (error) {
        console.error('✗ Error disconnecting database:', error);
        throw error;
    }
}
async function checkDatabaseHealth() {
    try {
        const start = Date.now();
        await exports.prisma.$queryRaw `SELECT 1`;
        const latency = Date.now() - start;
        return {
            status: 'healthy',
            latency
        };
    }
    catch (error) {
        return {
            status: 'unhealthy',
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
async function executeInTransaction(callback) {
    return exports.prisma.$transaction(callback);
}
async function batchExecute(operations) {
    return Promise.all(operations);
}
exports.default = exports.prisma;
//# sourceMappingURL=database.js.map