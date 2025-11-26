/**
 * Prisma Soft Delete Extension
 * Sprint 4 - Epic 3: Soft Delete Pattern
 *
 * Provides explicit methods for soft delete operations:
 * - softDelete() - Mark records as deleted
 * - restore() - Restore soft-deleted records
 * - findManyWithDeleted() - Query including deleted records
 * - findDeleted() - Query only deleted records
 */

import { Prisma } from '@prisma/client';
import { createLogger } from '../../utils/logger';

const logger = createLogger('SoftDeleteExtension');

/**
 * Soft Delete Extension
 *
 * Extends Prisma Client with soft delete methods for Event, Contest, and Category models
 */
export const softDeleteExtension = Prisma.defineExtension({
  name: 'softDelete',
  model: {
    // Event model extensions
    event: {
      /**
       * Soft delete an event
       */
      async softDelete(args: { where: Prisma.EventWhereUniqueInput; deletedBy?: string }) {
        const { where, deletedBy } = args;

        logger.info('Soft deleting event', { where, deletedBy });

        return (this as any).update({
          where,
          data: {
            deletedAt: new Date(),
            deletedBy: deletedBy || null,
          },
        });
      },

      /**
       * Restore a soft-deleted event
       */
      async restore(args: { where: Prisma.EventWhereUniqueInput }) {
        const { where } = args;

        logger.info('Restoring event', { where });

        return (this as any).update({
          where,
          data: {
            deletedAt: null,
            deletedBy: null,
          },
        });
      },

      /**
       * Find events including deleted ones
       */
      async findManyWithDeleted(args?: Prisma.EventFindManyArgs) {
        logger.debug('Finding events including deleted');

        return (this as any).findMany({
          ...args,
          includeDeleted: true,
        });
      },

      /**
       * Find only deleted events
       */
      async findDeleted(args?: Prisma.EventFindManyArgs) {
        logger.debug('Finding deleted events');

        const where: any = {
          ...(args?.where || {}),
          deletedAt: { not: null },
        };

        return (this as any).findMany({
          ...args,
          where,
          includeDeleted: true,
        });
      },
    },

    // Contest model extensions
    contest: {
      /**
       * Soft delete a contest
       */
      async softDelete(args: { where: Prisma.ContestWhereUniqueInput; deletedBy?: string }) {
        const { where, deletedBy } = args;

        logger.info('Soft deleting contest', { where, deletedBy });

        return (this as any).update({
          where,
          data: {
            deletedAt: new Date(),
            deletedBy: deletedBy || null,
          },
        });
      },

      /**
       * Restore a soft-deleted contest
       */
      async restore(args: { where: Prisma.ContestWhereUniqueInput }) {
        const { where } = args;

        logger.info('Restoring contest', { where });

        return (this as any).update({
          where,
          data: {
            deletedAt: null,
            deletedBy: null,
          },
        });
      },

      /**
       * Find contests including deleted ones
       */
      async findManyWithDeleted(args?: Prisma.ContestFindManyArgs) {
        logger.debug('Finding contests including deleted');

        return (this as any).findMany({
          ...args,
          includeDeleted: true,
        });
      },

      /**
       * Find only deleted contests
       */
      async findDeleted(args?: Prisma.ContestFindManyArgs) {
        logger.debug('Finding deleted contests');

        const where: any = {
          ...(args?.where || {}),
          deletedAt: { not: null },
        };

        return (this as any).findMany({
          ...args,
          where,
          includeDeleted: true,
        });
      },
    },

    // Category model extensions
    category: {
      /**
       * Soft delete a category
       */
      async softDelete(args: { where: Prisma.CategoryWhereUniqueInput; deletedBy?: string }) {
        const { where, deletedBy } = args;

        logger.info('Soft deleting category', { where, deletedBy });

        return (this as any).update({
          where,
          data: {
            deletedAt: new Date(),
            deletedBy: deletedBy || null,
          },
        });
      },

      /**
       * Restore a soft-deleted category
       */
      async restore(args: { where: Prisma.CategoryWhereUniqueInput }) {
        const { where } = args;

        logger.info('Restoring category', { where });

        return (this as any).update({
          where,
          data: {
            deletedAt: null,
            deletedBy: null,
          },
        });
      },

      /**
       * Find categories including deleted ones
       */
      async findManyWithDeleted(args?: Prisma.CategoryFindManyArgs) {
        logger.debug('Finding categories including deleted');

        return (this as any).findMany({
          ...args,
          includeDeleted: true,
        });
      },

      /**
       * Find only deleted categories
       */
      async findDeleted(args?: Prisma.CategoryFindManyArgs) {
        logger.debug('Finding deleted categories');

        const where: any = {
          ...(args?.where || {}),
          deletedAt: { not: null },
        };

        return (this as any).findMany({
          ...args,
          where,
          includeDeleted: true,
        });
      },
    },
  },
});

export default softDeleteExtension;
