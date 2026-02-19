/**
 * Legacy Prisma import compatibility layer.
 *
 * Keeps historical imports working while routing all access through
 * the centralized context-aware client in `config/database`.
 */

import prisma, { prisma as namedPrisma, rawPrisma } from '../config/database';

export default prisma;
export { namedPrisma as prisma, rawPrisma };
