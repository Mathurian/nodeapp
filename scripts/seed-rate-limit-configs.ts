/**
 * Seed Default Rate Limit Configurations
 *
 * Creates default rate limit configurations for all tiers.
 * Run with: npx ts-node scripts/seed-rate-limit-configs.ts
 */

import { PrismaClient } from '@prisma/client';
import { RATE_LIMIT_TIERS, ENDPOINT_RATE_LIMITS } from '../src/config/rate-limit.config';

const prisma = new PrismaClient();

async function seedRateLimitConfigs() {
  console.log('🌱 Seeding rate limit configurations...\n');

  try {
    // 1. Create default tier configurations (global, no tenant/user/endpoint)
    console.log('Creating default tier configurations...');

    for (const [tierKey, tierConfig] of Object.entries(RATE_LIMIT_TIERS)) {
      const existing = await prisma.rateLimitConfig.findFirst({
        where: {
          tier: tierKey,
          tenantId: null,
          userId: null,
          endpoint: null,
        },
      });

      if (existing) {
        console.log(`  ✓ ${tierConfig.name} tier already exists (${existing.id})`);
        continue;
      }

      const config = await prisma.rateLimitConfig.create({
        data: {
          name: `${tierConfig.name} Tier Default`,
          tier: tierKey,
          tenantId: null,
          userId: null,
          endpoint: null,
          requestsPerHour: tierConfig.requestsPerHour,
          requestsPerMinute: tierConfig.requestsPerMinute,
          burstLimit: tierConfig.burstLimit,
          enabled: true,
          priority: 0, // Lowest priority (defaults)
          description: `Default rate limits for ${tierConfig.name} tier subscribers`,
        },
      });

      console.log(`  ✓ Created ${tierConfig.name} tier (${config.id})`);
    }

    // 2. Create endpoint-specific overrides (global)
    console.log('\nCreating endpoint-specific overrides...');

    for (const [endpoint, limits] of Object.entries(ENDPOINT_RATE_LIMITS)) {
      const existing = await prisma.rateLimitConfig.findFirst({
        where: {
          endpoint,
          tenantId: null,
          userId: null,
        },
      });

      if (existing) {
        console.log(`  ✓ ${endpoint} override already exists (${existing.id})`);
        continue;
      }

      const config = await prisma.rateLimitConfig.create({
        data: {
          name: `${endpoint} Endpoint Override`,
          tier: null,
          tenantId: null,
          userId: null,
          endpoint,
          requestsPerHour: limits.requestsPerHour!,
          requestsPerMinute: limits.requestsPerMinute!,
          burstLimit: limits.burstLimit!,
          enabled: true,
          priority: 100, // Higher priority than tier defaults
          description: `Stricter limits for ${endpoint} to prevent abuse`,
        },
      });

      console.log(`  ✓ Created ${endpoint} override (${config.id})`);
    }

    // 3. Summary
    const totalConfigs = await prisma.rateLimitConfig.count();
    console.log(`\n✅ Seeding complete! Total configurations: ${totalConfigs}\n`);

    // 4. Display summary
    const configs = await prisma.rateLimitConfig.findMany({
      orderBy: [
        { priority: 'desc' },
        { tier: 'asc' },
      ],
    });

    console.log('Current Rate Limit Configurations:');
    console.log('═══════════════════════════════════════════════════════════════\n');

    for (const config of configs) {
      const scope = config.endpoint
        ? `Endpoint: ${config.endpoint}`
        : config.tier
        ? `Tier: ${config.tier}`
        : 'Global';

      console.log(`📋 ${config.name}`);
      console.log(`   Scope: ${scope}`);
      console.log(`   Limits: ${config.requestsPerHour}/hr, ${config.requestsPerMinute}/min, burst: ${config.burstLimit}`);
      console.log(`   Priority: ${config.priority} | Enabled: ${config.enabled ? '✅' : '❌'}`);
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error seeding rate limit configurations:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedRateLimitConfigs()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
