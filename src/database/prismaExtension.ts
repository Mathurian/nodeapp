/**
 * Prisma Client Extension for Read Replicas
 *
 * Creates separate Prisma clients for primary (write) and replica (read) databases.
 * Falls back to primary if replica is not configured.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export interface PrismaClients {
  primary: PrismaClient;
  replica: PrismaClient;
}

/**
 * Create Prisma clients for primary and replica databases
 */
export function createPrismaClientWithReplica(): PrismaClients {
  const primaryUrl = process.env.DATABASE_URL;
  const replicaUrl = process.env.DATABASE_REPLICA_URL;

  if (!primaryUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  // Create primary client
  const primary = new PrismaClient({
    datasources: {
      db: {
        url: primaryUrl,
      },
    },
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'info', 'warn', 'error']
      : ['error'],
  });

  // Create replica client or use primary as fallback
  const replica = replicaUrl
    ? new PrismaClient({
        datasources: {
          db: {
            url: replicaUrl,
          },
        },
        log: process.env.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['error'],
      })
    : primary;

  if (!replicaUrl) {
    logger.info('No DATABASE_REPLICA_URL configured, using primary for all queries');
  } else {
    logger.info('Read replica configured', {
      primary: primaryUrl.replace(/:([^:@]+)@/, ':***@'), // Mask password
      replica: replicaUrl.replace(/:([^:@]+)@/, ':***@'),
    });
  }

  return { primary, replica };
}
