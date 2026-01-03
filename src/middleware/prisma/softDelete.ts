/**
 * Prisma Soft Delete Middleware
 * Sprint 4 - Epic 3: Soft Delete Pattern
 *
 * Automatically filters out soft-deleted records from queries
 * and converts delete operations to soft deletes.
 */

import { Prisma } from '@prisma/client';
import { createLogger } from '../../utils/logger';

const logger = createLogger('SoftDeleteMiddleware');

/**
 * Models that support soft delete
 * Phase 1: Event, Contest
 * Note: Category excluded due to complex nested includes causing Prisma validation errors
 * Category soft-delete filtering is handled manually in controllers
 */
const SOFT_DELETE_MODELS = ['Event', 'Contest'];

/**
 * Check if a model supports soft delete
 */
function supportsSoftDelete(model: string | undefined): boolean {
  return model ? SOFT_DELETE_MODELS.includes(model) : false;
}

/**
 * Check if an include object has nested includes
 * Returns true if any included relation has its own `include` or `select` property
 */
function hasNestedIncludes(include: any): boolean {
  if (!include || typeof include !== 'object') {
    return false;
  }

  // Simple check: if include exists and has any properties that are objects with select/include
  try {
    const json = JSON.stringify(include);
    // If the JSON contains "select" or "include" keys nested within, it has nested includes
    return json.includes('"select":{') || json.includes('"include":{');
  } catch {
    return false;
  }
}

/**
 * Soft Delete Middleware
 *
 * Intercepts Prisma queries and:
 * 1. Auto-excludes soft-deleted records from findMany/findFirst/findUnique
 * 2. Converts delete/deleteMany to soft delete (update deletedAt)
 * 3. Allows explicit access to deleted records via includeDeleted flag
 */
export function createSoftDeleteMiddleware(): Prisma.Middleware {
  return async (params, next) => {
    // Only apply to models that support soft delete
    if (!supportsSoftDelete(params.model)) {
      return next(params);
    }

    // Skip middleware for queries with nested includes to avoid Prisma validation errors
    // Nested includes with soft-deleted relations should be handled at the service layer
    if (params.args?.include && hasNestedIncludes(params.args.include)) {
      logger.debug(`Skipping soft-delete middleware for query with nested includes`, { model: params.model });
      return next(params);
    }

    // Handle different actions
    switch (params.action) {
      // Convert delete to soft delete (update)
      case 'delete': {
        logger.debug(`Soft deleting ${params.model}`, { where: params.args.where });

        params.action = 'update';
        params.args.data = {
          deletedAt: new Date(),
          // deletedBy will be set by the service layer
        };

        break;
      }

      // Convert deleteMany to soft delete (updateMany)
      case 'deleteMany': {
        logger.debug(`Soft deleting multiple ${params.model}`, { where: params.args.where });

        params.action = 'updateMany';
        params.args.data = {
          deletedAt: new Date(),
          // deletedBy will be set by the service layer
        };

        break;
      }

      // Auto-filter deleted records from findUnique
      // Convert to findFirst to support complex where clauses
      case 'findUnique': {
        // Check if query explicitly wants to include deleted records
        const includeDeleted = params.args?.includeDeleted;

        // Remove includeDeleted flag (it's not a valid Prisma arg)
        if (params.args?.includeDeleted !== undefined) {
          delete params.args.includeDeleted;
        }

        // If not explicitly including deleted, filter them out
        if (!includeDeleted) {
          // Convert findUnique to findFirst to support complex where clause
          params.action = 'findFirst';

          // Add deletedAt: null filter to where clause
          if (params.args.where) {
            params.args.where = {
              AND: [
                params.args.where,
                { deletedAt: null }
              ]
            };
          } else {
            params.args.where = { deletedAt: null };
          }

          logger.debug(`Auto-filtering deleted ${params.model} records (converted findUnique to findFirst)`);
        }

        break;
      }

      // Auto-filter deleted records from other queries
      case 'findFirst':
      case 'findMany':
      case 'count':
      case 'aggregate': {
        // Check if query explicitly wants to include deleted records
        const includeDeleted = params.args?.includeDeleted;

        // Remove includeDeleted flag (it's not a valid Prisma arg)
        if (params.args?.includeDeleted !== undefined) {
          delete params.args.includeDeleted;
        }

        // If not explicitly including deleted, filter them out
        if (!includeDeleted) {
          // Add deletedAt: null filter to where clause
          if (params.args.where) {
            params.args.where = {
              AND: [
                params.args.where,
                { deletedAt: null }
              ]
            };
          } else {
            params.args.where = { deletedAt: null };
          }

          logger.debug(`Auto-filtering deleted ${params.model} records`);
        }

        break;
      }

      // Update operations - no special handling needed
      // (allow updating both deleted and non-deleted records)
      case 'update':
      case 'updateMany':
      case 'upsert':
        // No modifications needed
        break;
    }

    // Execute the query
    return next(params);
  };
}

/**
 * Register soft delete middleware with Prisma client
 *
 * @example
 * ```typescript
 * import { registerSoftDeleteMiddleware } from './middleware/prisma/softDelete';
 * import prisma from './config/database';
 *
 * registerSoftDeleteMiddleware(prisma);
 * ```
 */
export function registerSoftDeleteMiddleware(prisma: any): void {
  const middleware = createSoftDeleteMiddleware();
  prisma.$use(middleware);

  logger.info('Soft delete middleware registered', {
    models: SOFT_DELETE_MODELS
  });
}

export default {
  createSoftDeleteMiddleware,
  registerSoftDeleteMiddleware,
  SOFT_DELETE_MODELS,
};
