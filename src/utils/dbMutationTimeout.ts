import { Prisma, PrismaClient } from '@prisma/client';
import { QUERY_TIMEOUTS } from '../config/queryTimeouts';

const normalizeTimeoutMs = (timeoutMs: number): number => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return QUERY_TIMEOUTS.standard;
  }

  return Math.max(1, Math.floor(timeoutMs));
};

const setTransactionStatementTimeout = async (
  tx: Prisma.TransactionClient,
  timeoutMs: number,
): Promise<void> => {
  const normalizedTimeoutMs = normalizeTimeoutMs(timeoutMs);
  await tx.$executeRawUnsafe(`SET LOCAL statement_timeout = ${normalizedTimeoutMs}`);
};

export const withMutationTimeoutTx = async <T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
  timeoutMs: number = QUERY_TIMEOUTS.standard,
  prismaClient?: PrismaClient,
): Promise<T> => {
  const client = prismaClient ?? (await import('../config/database')).rawPrisma;
  return await client.$transaction(async (tx) => {
    await setTransactionStatementTimeout(tx, timeoutMs);
    return await callback(tx);
  });
};

export const withExistingTransactionTimeout = async <T>(
  tx: Prisma.TransactionClient,
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
  timeoutMs: number = QUERY_TIMEOUTS.standard,
): Promise<T> => {
  await setTransactionStatementTimeout(tx, timeoutMs);
  return await callback(tx);
};
