/**
 * Caching Decorator Examples
 *
 * Practical examples demonstrating how to use the @Cacheable decorator
 * for performance optimization in services.
 *
 * Installation:
 * npm install ioredis
 *
 * Setup Redis:
 * - Local: docker run -d -p 6379:6379 redis:7-alpine
 * - Production: Use managed Redis (AWS ElastiCache, Google Cloud Memorystore, etc.)
 */

import { Cacheable, CacheInvalidator, CacheWarmer } from '../decorators/Cacheable';
import prisma from '../config/database';
import logger from '../utils/logger';

// ============================================================================
// Example 1: Basic Caching - Event Service
// ============================================================================

export class EventService {
  /**
   * Cache single event lookups for 1 hour
   * Key pattern: events:getEventById:eventId
   */
  @Cacheable({ ttl: 3600, namespace: 'events' })
  async getEventById(id: string) {
    logger.info(`Fetching event ${id} from database`);
    return prisma.event.findUnique({
      where: { id },
      include: {
        contests: true,
        organizer: {
          select: { id: true, name: true, email: true }
        }
      }
    });
  }

  /**
   * Cache all events list for 5 minutes (shorter TTL for frequently changing data)
   */
  @Cacheable({ ttl: 300, namespace: 'events', keyPrefix: 'allEvents' })
  async getAllEvents() {
    logger.info('Fetching all events from database');
    return prisma.event.findMany({
      where: { archived: false },
      orderBy: { startDate: 'desc' }
    });
  }

  /**
   * Invalidate cache when creating new event
   */
  async createEvent(data: any) {
    const event = await prisma.event.create({ data });

    // Invalidate all events list cache
    await CacheInvalidator.invalidateByPattern('events:allEvents:*');

    return event;
  }

  /**
   * Invalidate specific event cache when updating
   */
  async updateEvent(id: string, data: any) {
    const event = await prisma.event.update({ where: { id }, data });

    // Invalidate this specific event and all events list
    await CacheInvalidator.invalidate('events', 'getEventById', [id]);
    await CacheInvalidator.invalidateByPattern('events:allEvents:*');

    return event;
  }
}

// ============================================================================
// Example 2: Paginated Results with Custom Key Generation
// ============================================================================

export class ScoreService {
  /**
   * Cache paginated results with custom key including page and limit
   */
  @Cacheable({
    ttl: 600, // 10 minutes
    namespace: 'scores',
    keyGenerator: (args) => {
      const [categoryId, page, limit] = args;
      return `category:${categoryId}:page:${page}:limit:${limit}`;
    }
  })
  async getCategoryScores(categoryId: string, page: number = 1, limit: number = 50) {
    logger.info(`Fetching scores for category ${categoryId}, page ${page}`);

    return prisma.score.findMany({
      where: { categoryId },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        judge: { select: { id: true, name: true } },
        contestant: { select: { id: true, name: true, number: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Cache aggregate results (average scores, rankings)
   */
  @Cacheable({
    ttl: 1800, // 30 minutes
    namespace: 'scores',
    keyPrefix: 'categoryAggregates'
  })
  async getCategoryAggregates(categoryId: string) {
    logger.info(`Calculating aggregates for category ${categoryId}`);

    const scores = await prisma.score.groupBy({
      by: ['contestantId'],
      where: { categoryId },
      _avg: { value: true },
      _count: true
    });

    return scores.map((s, index) => ({
      contestantId: s.contestantId,
      averageScore: s._avg.value,
      scoreCount: s._count,
      rank: index + 1
    }));
  }

  /**
   * Invalidate all cached scores for a category when new score is added
   */
  async submitScore(data: any) {
    const score = await prisma.score.create({ data });

    // Invalidate all caches related to this category
    await CacheInvalidator.invalidateByPattern(`scores:*category:${data.categoryId}*`);
    await CacheInvalidator.invalidateByPattern(`scores:categoryAggregates:${data.categoryId}*`);

    return score;
  }
}

// ============================================================================
// Example 3: User Authentication with Session Tracking
// ============================================================================

export class AuthService {
  /**
   * Cache user profile for 15 minutes
   * Automatically invalidated on session version change
   */
  @Cacheable({
    ttl: 900,
    namespace: 'auth',
    keyGenerator: (args) => {
      const [userId] = args;
      return `userProfile:${userId}`;
    }
  })
  async getUserProfile(userId: string) {
    logger.info(`Fetching profile for user ${userId}`);

    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        sessionVersion: true,
        judgeId: true,
        contestantId: true
      }
    });
  }

  /**
   * Don't cache login attempts (security)
   */
  async login(email: string, password: string) {
    // Never cache authentication logic
    logger.info(`Login attempt for ${email}`);

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user || !this.verifyPassword(password, user.password)) {
      throw new Error('Invalid credentials');
    }

    // Update session tracking
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        sessionVersion: user.sessionVersion + 1
      }
    });

    // Invalidate cached profile (session version changed)
    await CacheInvalidator.invalidate('auth', 'userProfile', [user.id]);

    return user;
  }

  /**
   * Invalidate all user caches on logout
   */
  async logout(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { sessionVersion: { increment: 1 } }
    });

    // Clear all cached data for this user
    await CacheInvalidator.invalidateByPattern(`auth:*${userId}*`);
  }

  private verifyPassword(input: string, hashed: string): boolean {
    // Password verification logic
    return true; // Placeholder
  }
}

// ============================================================================
// Example 4: Conditional Caching - Don't Cache Null Results
// ============================================================================

export class ContestantService {
  /**
   * Cache contestant lookups, but not null results (contestant not found)
   * This prevents caching 404 responses
   */
  @Cacheable({
    ttl: 3600,
    namespace: 'contestants',
    cacheNullable: false // Don't cache null/undefined results
  })
  async getContestantById(id: string) {
    logger.info(`Fetching contestant ${id}`);

    const contestant = await prisma.contestant.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    return contestant; // May be null if not found
  }

  /**
   * Cache search results for 5 minutes
   */
  @Cacheable({
    ttl: 300,
    namespace: 'contestants',
    keyGenerator: (args) => `search:${args[0]}`
  })
  async searchContestants(query: string) {
    logger.info(`Searching contestants: ${query}`);

    return prisma.contestant.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { number: { contains: query } }
        ]
      },
      take: 20
    });
  }
}

// ============================================================================
// Example 5: Cache Warming - Preload Critical Data
// ============================================================================

export class SystemService {
  /**
   * Warm up event caches on application startup
   */
  static async warmupEventCaches() {
    logger.info('Warming up event caches...');

    const eventService = new EventService();

    // Get all upcoming events
    const upcomingEvents = await prisma.event.findMany({
      where: {
        startDate: { gte: new Date() },
        archived: false
      },
      take: 50
    });

    // Preload cache for each event
    await CacheWarmer.warmup('events', 'getEventById',
      upcomingEvents.map(e => [e.id]),
      async (id) => {
        return eventService.getEventById(id);
      }
    );

    logger.info(`✓ Warmed up ${upcomingEvents.length} event caches`);
  }

  /**
   * Warm up critical category aggregates
   */
  static async warmupScoringCaches() {
    logger.info('Warming up scoring caches...');

    const scoreService = new ScoreService();

    // Get active categories
    const activeCategories = await prisma.category.findMany({
      where: {
        contest: {
          archived: false
        }
      },
      take: 100
    });

    // Preload aggregates
    await CacheWarmer.warmup('scores', 'categoryAggregates',
      activeCategories.map(c => [c.id]),
      async (categoryId) => {
        return scoreService.getCategoryAggregates(categoryId);
      }
    );

    logger.info(`✓ Warmed up ${activeCategories.length} category aggregate caches`);
  }
}

// ============================================================================
// Example 6: Debug Mode for Development
// ============================================================================

export class ReportService {
  /**
   * Enable debug logging to see cache hits/misses
   */
  @Cacheable({
    ttl: 7200, // 2 hours
    namespace: 'reports',
    debug: process.env.NODE_ENV === 'development' // Only in dev
  })
  async generateEventReport(eventId: string) {
    logger.info(`Generating report for event ${eventId}`);

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        contests: {
          include: {
            categories: {
              include: {
                scores: true
              }
            }
          }
        }
      }
    });

    // Complex report generation logic
    return {
      eventId,
      totalContests: event?.contests.length,
      totalCategories: event?.contests.reduce((sum, c) => sum + c.categories.length, 0),
      generatedAt: new Date()
    };
  }
}

// ============================================================================
// Example 7: Integration in Server Startup
// ============================================================================

/**
 * Add this to your server.ts startup sequence:
 */
export async function initializePerformanceFeatures() {
  try {
    logger.info('Initializing performance features...');

    // 1. Warm up critical caches
    if (process.env.CACHE_WARMUP_ENABLED === 'true') {
      await SystemService.warmupEventCaches();
      await SystemService.warmupScoringCaches();
    }

    // 2. Schedule cache warmup every hour
    setInterval(async () => {
      try {
        await SystemService.warmupEventCaches();
        await SystemService.warmupScoringCaches();
      } catch (error) {
        logger.error('Cache warmup failed:', error);
      }
    }, 3600000); // 1 hour

    // 3. Schedule cache cleanup (remove stale keys)
    setInterval(async () => {
      try {
        const deleted = await CacheInvalidator.invalidateByPattern('*');
        logger.info(`Cache cleanup: removed ${deleted} stale keys`);
      } catch (error) {
        logger.error('Cache cleanup failed:', error);
      }
    }, 86400000); // 24 hours

    logger.info('✓ Performance features initialized');
  } catch (error) {
    logger.error('Failed to initialize performance features:', error);
    // Don't throw - app should still work without caching
  }
}

// ============================================================================
// Example 8: Environment Configuration
// ============================================================================

/**
 * Add to your .env file:
 *
 * # Redis Configuration
 * REDIS_URL=redis://localhost:6379
 * REDIS_PASSWORD=your_password_here
 * REDIS_DB=0
 *
 * # Cache Configuration
 * CACHE_ENABLED=true
 * CACHE_WARMUP_ENABLED=true
 * CACHE_DEFAULT_TTL=300
 *
 * # Development
 * CACHE_DEBUG=true  # Enable debug logging
 */

/**
 * Best Practices:
 *
 * 1. **Cache Read-Heavy Operations**
 *    - Event listings, category aggregates, leaderboards
 *    - User profiles, role assignments
 *    - Static content, templates, system settings
 *
 * 2. **Don't Cache Write-Heavy Operations**
 *    - Score submissions, authentication
 *    - Real-time updates, live scoring
 *    - Sensitive data (passwords, tokens)
 *
 * 3. **TTL Guidelines**
 *    - Static data (settings, templates): 3600-7200s (1-2 hours)
 *    - Semi-static (events, users): 600-1800s (10-30 minutes)
 *    - Frequently changing (scores, rankings): 60-300s (1-5 minutes)
 *    - Real-time data: Don't cache
 *
 * 4. **Invalidation Strategy**
 *    - Always invalidate on write operations (create, update, delete)
 *    - Use pattern matching for related data
 *    - Invalidate parent and child relationships
 *
 * 5. **Monitoring**
 *    - Track cache hit/miss ratios
 *    - Monitor Redis memory usage
 *    - Set up alerts for cache errors
 *    - Log slow queries that could benefit from caching
 */
