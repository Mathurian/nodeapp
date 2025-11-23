/**
 * Ensure Default Tenant Exists
 * This utility ensures the default tenant exists in the database during startup
 */

import { prisma } from '../config/database';
import { createLogger } from './logger';

const logger = createLogger('default');

/**
 * Ensure the default tenant exists in the database
 * Creates it if it doesn't exist
 */
export async function ensureDefaultTenant(): Promise<void> {
  try {
    // Check if default tenant exists
    let tenant = await prisma.tenant.findUnique({
      where: { id: 'default_tenant' }
    });

    if (!tenant) {
      logger.warn('Default tenant not found, creating...');

      // Try to find by slug as well
      tenant = await prisma.tenant.findUnique({
        where: { slug: 'default' }
      });

      if (!tenant) {
        // Create the default tenant
        tenant = await prisma.tenant.create({
          data: {
            id: 'default_tenant',
            name: 'Default Organization',
            slug: 'default',
            domain: null,
            isActive: true,
            planType: 'enterprise',
            subscriptionStatus: 'active',
            settings: {}
          }
        });

        logger.info('✓ Created default tenant successfully');
      } else {
        logger.info('✓ Default tenant found by slug');
      }
    } else {
      logger.info('✓ Default tenant exists');
    }

    // Verify tenant is active
    if (!tenant.isActive) {
      logger.warn('Default tenant is inactive, activating...');
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { isActive: true }
      });
      logger.info('✓ Default tenant activated');
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    logger.error('Failed to ensure default tenant exists:', {
      error: errorMessage,
      stack: errorStack
    });
    throw error;
  }
}
