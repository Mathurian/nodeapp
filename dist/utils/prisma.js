"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const prismaConfig = {
    datasources: {
        db: {
            url: process.env.DATABASE_URL,
        },
    },
    log: (process.env.NODE_ENV === 'production'
        ? ['error', 'warn']
        : ['query', 'info', 'warn', 'error']),
};
let prisma;
if (process.env.NODE_ENV === 'production') {
    exports.prisma = prisma = new client_1.PrismaClient(prismaConfig);
}
else {
    if (!global.__prisma) {
        global.__prisma = new client_1.PrismaClient({
            ...prismaConfig,
            log: process.env.NODE_ENV === 'test' ? ['error'] : prismaConfig.log,
        });
    }
    exports.prisma = prisma = global.__prisma;
}
if (process.env.NODE_ENV !== 'test') {
    process.on('SIGINT', async () => {
        await prisma.$disconnect();
        process.exit(0);
    });
    process.on('SIGTERM', async () => {
        await prisma.$disconnect();
        process.exit(0);
    });
}
exports.default = prisma;
//# sourceMappingURL=prisma.js.map