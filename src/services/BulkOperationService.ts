import { injectable } from 'tsyringe';
import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { createLogger } from '../utils/logger';
import { getRequestContext } from '../middleware/correlationId';

const Logger = createLogger('BulkOperationService');

export interface BulkOperationResult<T = unknown> {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{ item: T; error: string }>;
}

export interface BulkOperationOptions {
  continueOnError?: boolean;
  batchSize?: number;
}

export interface BulkOperationScope {
  mode: 'tenant' | 'global';
  tenantId?: string;
}

@injectable()
export class BulkOperationService {
  // Use singleton prisma instead of creating new instance

  private resolveScope(scope?: BulkOperationScope): BulkOperationScope {
    if (scope?.mode === 'tenant') {
      const tenantId = String(scope.tenantId || '').trim();
      if (!tenantId) {
        throw new Error('Tenant scope requires tenantId');
      }
      return { mode: 'tenant', tenantId };
    }

    if (scope?.mode === 'global') {
      return { mode: 'global' };
    }

    const context = getRequestContext();
    if (context?.isSuperAdmin) {
      return { mode: 'global' };
    }

    const contextTenantId = String(context?.tenantId || '').trim();
    if (contextTenantId) {
      return { mode: 'tenant', tenantId: contextTenantId };
    }

    Logger.warn('Bulk operation running without explicit scope or request tenant context; defaulting to global scope');
    return { mode: 'global' };
  }

  private applyScopeToWhere(where: Record<string, unknown>, scope: BulkOperationScope): Record<string, unknown> {
    if (scope.mode === 'tenant' && scope.tenantId) {
      return {
        ...where,
        tenantId: scope.tenantId
      };
    }
    return where;
  }

  private applyScopeToCreateData<T extends Record<string, any>>(data: T, scope: BulkOperationScope): T {
    if (scope.mode === 'tenant' && scope.tenantId) {
      return {
        ...data,
        tenantId: scope.tenantId
      };
    }
    return data;
  }

  /**
   * Execute a bulk operation on multiple items
   * @param operation Function to execute on each item
   * @param items Array of items to process
   * @param options Operation options
   */
  async executeBulkOperation<T>(
    operation: (item: T) => Promise<void>,
    items: T[],
    options: BulkOperationOptions = {}
  ): Promise<BulkOperationResult> {
    const { continueOnError = true, batchSize = 10 } = options;

    const result: BulkOperationResult = {
      total: items.length,
      successful: 0,
      failed: 0,
      errors: []
    };

    // Process in batches to avoid overwhelming the database
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      const promises = batch.map(async (item) => {
        try {
          await operation(item);
          result.successful++;
        } catch (error) {
          result.failed++;
          result.errors.push({
            item,
            error: error instanceof Error ? error.message : String(error)
          });

          Logger.error('Bulk operation failed for item', { item, error });

          if (!continueOnError) {
            throw error;
          }
        }
      });

      await Promise.all(promises);

      // Stop if we hit an error and continueOnError is false
      if (!continueOnError && result.failed > 0) {
        break;
      }
    }

    Logger.info('Bulk operation completed', {
      total: result.total,
      successful: result.successful,
      failed: result.failed
    });

    return result;
  }

  /**
   * Execute a bulk operation within a Prisma transaction
   * All operations succeed or all fail
   * @param operation Function to execute within transaction
   * @param items Array of items to process
   */
  async executeBulkOperationWithTransaction<T>(
    operation: (items: T[], tx: Prisma.TransactionClient) => Promise<void>,
    items: T[],
    scope?: BulkOperationScope
  ): Promise<void> {
    try {
      const resolvedScope = this.resolveScope(scope);
      await prisma.$transaction(async (tx) => {
        await operation(items, tx);
      });

      Logger.info('Bulk transaction completed successfully', {
        itemCount: items.length,
        scope: resolvedScope.mode,
        tenantId: resolvedScope.tenantId
      });
    } catch (error) {
      Logger.error('Bulk transaction failed, rolling back', { error });
      throw error;
    }
  }

  /**
   * Execute bulk create operation
   * @param model Prisma model name
   * @param data Array of data to create
   */
  async bulkCreate<T extends Record<string, any>>(
    model: string,
    data: T[],
    scope?: BulkOperationScope
  ): Promise<BulkOperationResult> {
    const resolvedScope = this.resolveScope(scope);
    const result: BulkOperationResult = {
      total: data.length,
      successful: 0,
      failed: 0,
      errors: []
    };

    try {
      // Use createMany for better performance
      const scopedData = data.map((item) => this.applyScopeToCreateData(item, resolvedScope));
      const created = await (prisma as any)[model].createMany({
        data: scopedData,
        skipDuplicates: true
      });

      result.successful = created.count;

      Logger.info(`Bulk created ${created.count} ${model} records`, {
        scope: resolvedScope.mode,
        tenantId: resolvedScope.tenantId
      });
    } catch (error) {
      result.failed = data.length;
      result.errors.push({
        item: data,
        error: error instanceof Error ? error.message : String(error)
      });

      Logger.error(`Bulk create failed for ${model}`, { error });
    }

    return result;
  }

  /**
   * Execute bulk update operation
   * @param model Prisma model name
   * @param updates Array of {id, data} to update
   */
  async bulkUpdate<T extends Record<string, any>>(
    model: string,
    updates: Array<{ id: string; data: T }>,
    scope?: BulkOperationScope
  ): Promise<BulkOperationResult> {
    const resolvedScope = this.resolveScope(scope);
    return this.executeBulkOperation(
      async (update) => {
        await (prisma as any)[model].update({
          where: this.applyScopeToWhere({ id: update.id }, resolvedScope),
          data: this.applyScopeToCreateData(update.data, resolvedScope)
        });
      },
      updates,
      { continueOnError: true }
    );
  }

  /**
   * Execute bulk delete operation
   * @param model Prisma model name
   * @param ids Array of IDs to delete
   */
  async bulkDelete(
    model: string,
    ids: string[],
    scope?: BulkOperationScope
  ): Promise<BulkOperationResult> {
    const resolvedScope = this.resolveScope(scope);
    const result: BulkOperationResult = {
      total: ids.length,
      successful: 0,
      failed: 0,
      errors: []
    };

    try {
      const deleted = await (prisma as any)[model].deleteMany({
        where: this.applyScopeToWhere({
          id: {
            in: ids
          }
        }, resolvedScope)
      });

      result.successful = deleted.count;

      Logger.info(`Bulk deleted ${deleted.count} ${model} records`, {
        scope: resolvedScope.mode,
        tenantId: resolvedScope.tenantId
      });
    } catch (error) {
      result.failed = ids.length;
      result.errors.push({
        item: ids,
        error: error instanceof Error ? error.message : String(error)
      });

      Logger.error(`Bulk delete failed for ${model}`, { error });
    }

    return result;
  }

  /**
   * Execute bulk soft delete (set active = false)
   * @param model Prisma model name
   * @param ids Array of IDs to soft delete
   */
  async bulkSoftDelete(
    model: string,
    ids: string[],
    scope?: BulkOperationScope
  ): Promise<BulkOperationResult> {
    const resolvedScope = this.resolveScope(scope);
    const result: BulkOperationResult = {
      total: ids.length,
      successful: 0,
      failed: 0,
      errors: []
    };

    try {
      const updated = await (prisma as any)[model].updateMany({
        where: this.applyScopeToWhere({
          id: {
            in: ids
          }
        }, resolvedScope),
        data: this.applyScopeToCreateData({
          active: false
        }, resolvedScope)
      });

      result.successful = updated.count;

      Logger.info(`Bulk soft deleted ${updated.count} ${model} records`, {
        scope: resolvedScope.mode,
        tenantId: resolvedScope.tenantId
      });
    } catch (error) {
      result.failed = ids.length;
      result.errors.push({
        item: ids,
        error: error instanceof Error ? error.message : String(error)
      });

      Logger.error(`Bulk soft delete failed for ${model}`, { error });
    }

    return result;
  }
}
