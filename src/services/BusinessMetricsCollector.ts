/**
 * Business Metrics Collector
 * Periodically collects business-specific metrics from the database
 * and exposes them via Prometheus
 */

import { injectable, inject } from 'tsyringe';
import { Gauge } from 'prom-client';
import { PrismaClient } from '@prisma/client';
import { createLogger } from '../utils/logger';
import { MetricsService } from './MetricsService';

const USER_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'ORGANIZER',
  'BOARD',
  'JUDGE',
  'CONTESTANT',
  'EMCEE',
  'TALLY_MASTER',
  'AUDITOR',
] as const;

@injectable()
export class BusinessMetricsCollector {
  private log = createLogger('business-metrics');
  private prisma: PrismaClient;
  private collectionInterval: NodeJS.Timeout | null = null;

  // Business metrics gauges
  private activeTenants: Gauge<string>;
  private activeEvents: Gauge<string>;
  private activeContests: Gauge<string>;
  private totalContestants: Gauge<string>;
  private totalJudges: Gauge<string>;
  private assignedJudges: Gauge<string>;
  private totalScores: Gauge<string>;
  private scoresLast24h: Gauge<string>;
  private activeUsers: Gauge<string>;
  private recentUsers24h: Gauge<string>;
  private recentUsers24hByRole: Gauge<string>;
  private usersByRole: Gauge<string>;
  private eventsByStatus: Gauge<string>;
  private contestsByEvent: Gauge<string>;
  private categoriesByContest: Gauge<string>;
  private pendingCertifications: Gauge<string>;
  private tenantsByScoringType: Gauge<string>;
  private eventsByScoringType: Gauge<string>;
  private contestsByScoringType: Gauge<string>;

  constructor(
    @inject('PrismaClient') prisma: PrismaClient,
    @inject('MetricsRegistry') private registry: any,
    @inject(MetricsService) private metricsService: MetricsService,
  ) {
    this.prisma = prisma;
    this.log.info(`Registry injected: ${!!registry}, type: ${typeof registry}`);

    // Initialize gauges
    this.activeTenants = new Gauge({
      name: 'tenants_active_total',
      help: 'Total number of active tenants',
      registers: [this.registry],
    });

    this.activeEvents = new Gauge({
      name: 'events_active_total',
      help: 'Total number of active (non-deleted) events',
      labelNames: ['tenant_id', 'tenant_name', 'tenant_slug'],
      registers: [this.registry],
    });

    this.activeContests = new Gauge({
      name: 'contests_active_total',
      help: 'Total number of active (non-deleted) contests',
      labelNames: ['tenant_id', 'tenant_name', 'tenant_slug'],
      registers: [this.registry],
    });

    this.totalContestants = new Gauge({
      name: 'contestants_total',
      help: 'Total number of contestants',
      labelNames: ['tenant_id', 'tenant_name', 'tenant_slug'],
      registers: [this.registry],
    });

    this.totalJudges = new Gauge({
      name: 'judges_total',
      help: 'Total number of judges',
      labelNames: ['tenant_id', 'tenant_name', 'tenant_slug'],
      registers: [this.registry],
    });

    this.assignedJudges = new Gauge({
      name: 'judges_assigned_total',
      help: 'Number of judges with category assignments',
      labelNames: ['tenant_id', 'tenant_name', 'tenant_slug'],
      registers: [this.registry],
    });

    this.totalScores = new Gauge({
      name: 'scores_total',
      help: 'Total number of scores submitted',
      labelNames: ['tenant_id', 'tenant_name', 'tenant_slug'],
      registers: [this.registry],
    });

    this.scoresLast24h = new Gauge({
      name: 'scores_last_24h_total',
      help: 'Number of scores submitted in last 24 hours',
      labelNames: ['tenant_id', 'tenant_name', 'tenant_slug'],
      registers: [this.registry],
    });

    this.activeUsers = new Gauge({
      name: 'users_active_total',
      help: 'Total number of active (non-deleted) users',
      labelNames: ['tenant_id', 'tenant_name', 'tenant_slug'],
      registers: [this.registry],
    });

    this.recentUsers24h = new Gauge({
      name: 'users_recent_24h_total',
      help: 'Number of users with a recorded login in the last 24 hours',
      labelNames: ['tenant_id', 'tenant_name', 'tenant_slug'],
      registers: [this.registry],
    });

    this.recentUsers24hByRole = new Gauge({
      name: 'users_recent_24h_by_role_total',
      help: 'Number of users by role with a recorded login in the last 24 hours',
      labelNames: ['tenant_id', 'tenant_name', 'tenant_slug', 'role'],
      registers: [this.registry],
    });

    this.usersByRole = new Gauge({
      name: 'users_by_role_total',
      help: 'Number of users by role',
      labelNames: ['tenant_id', 'tenant_name', 'tenant_slug', 'role'],
      registers: [this.registry],
    });

    this.eventsByStatus = new Gauge({
      name: 'events_by_status_total',
      help: 'Number of events by status',
      labelNames: ['tenant_id', 'tenant_name', 'tenant_slug', 'status'],
      registers: [this.registry],
    });

    this.contestsByEvent = new Gauge({
      name: 'contests_per_event_avg',
      help: 'Average number of contests per event',
      labelNames: ['tenant_id', 'tenant_name', 'tenant_slug'],
      registers: [this.registry],
    });

    this.categoriesByContest = new Gauge({
      name: 'categories_per_contest_avg',
      help: 'Average number of categories per contest',
      labelNames: ['tenant_id', 'tenant_name', 'tenant_slug'],
      registers: [this.registry],
    });

    this.pendingCertifications = new Gauge({
      name: 'certifications_pending_total',
      help: 'Number of pending certifications',
      labelNames: ['tenant_id', 'tenant_name', 'tenant_slug', 'type'],
      registers: [this.registry],
    });

    this.tenantsByScoringType = new Gauge({
      name: 'tenants_by_scoring_type_total',
      help: 'Number of tenants by scoring type',
      labelNames: ['scoring_type'],
      registers: [this.registry],
    });

    this.eventsByScoringType = new Gauge({
      name: 'events_by_scoring_type_total',
      help: 'Number of events by scoring type (including inherited from tenant)',
      labelNames: ['tenant_id', 'tenant_name', 'tenant_slug', 'scoring_type'],
      registers: [this.registry],
    });

    this.contestsByScoringType = new Gauge({
      name: 'contests_by_scoring_type_total',
      help: 'Number of contests by scoring type (including inherited from event/tenant)',
      labelNames: ['tenant_id', 'tenant_name', 'tenant_slug', 'scoring_type'],
      registers: [this.registry],
    });

    // Debug: Check if metrics were registered
    const metricsCount = (this.registry as any)._metrics ? Object.keys((this.registry as any)._metrics).length : 'unknown';
    this.log.info(`Business metrics collector initialized (${metricsCount} total metrics in registry)`);
  }

  /**
   * Start collecting metrics at regular intervals
   */
  start(intervalMs: number = 30000): void {
    if (this.collectionInterval) {
      this.log.warn('Business metrics collection already running');
      return;
    }

    this.log.info(`Starting business metrics collection (interval: ${intervalMs}ms)`);

    // Collect immediately on start
    this.collect().catch(err =>
      this.log.error('Error during initial metrics collection:', err)
    );

    // Then collect at intervals
    this.collectionInterval = setInterval(() => {
      this.collect().catch(err =>
        this.log.error('Error during periodic metrics collection:', err)
      );
    }, intervalMs);
    this.collectionInterval.unref?.();
  }

  /**
   * Stop collecting metrics
   */
  stop(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
      this.log.info('Business metrics collection stopped');
    }
  }

  /**
   * Collect all business metrics
   */
  private async collect(): Promise<void> {
    const startTime = Date.now();

    try {
      // Collect metrics for each tenant
      const tenants = await this.prisma.tenant.findMany({
        where: { isActive: true },
        select: { id: true, slug: true, name: true, scoringType: true },
      });

      this.activeTenants.set(tenants.length);
      this.tenantsByScoringType.reset();

      const tenantCountsByScoringType = new Map<string, number>();
      for (const tenant of tenants) {
        this.metricsService.registerTenantMetadata(tenant.id, tenant.name, tenant.slug);
        tenantCountsByScoringType.set(
          tenant.scoringType,
          (tenantCountsByScoringType.get(tenant.scoringType) || 0) + 1,
        );
      }

      for (const [scoringType, count] of tenantCountsByScoringType.entries()) {
        this.tenantsByScoringType.set({ scoring_type: scoringType }, count);
      }

      // Collect per-tenant metrics in parallel
      await Promise.all(
        tenants.map((tenant) => this.collectTenantMetrics(tenant))
      );

      const duration = Date.now() - startTime;
      this.log.info(`Business metrics collected in ${duration}ms`);
    } catch (error) {
      this.log.error('Failed to collect business metrics:', error);
      throw error;
    }
  }

  /**
   * Collect metrics for a specific tenant
   */
  private async collectTenantMetrics(tenant: {
    id: string;
    name: string;
    slug: string;
    scoringType: string;
  }): Promise<void> {
    const tenantId = tenant.id;
    const labels = this.metricsService.getTenantMetricLabels(tenant.id, {
      tenantName: tenant.name,
      tenantSlug: tenant.slug,
    });

    try {
      // Active events (non-deleted)
      const activeEventsCount = await this.prisma.event.count({
        where: {
          tenantId,
          deletedAt: null,
        },
      });
      this.activeEvents.set(labels, activeEventsCount);

      // Active contests (non-deleted)
      const activeContestsCount = await this.prisma.contest.count({
        where: {
          event: { tenantId },
          deletedAt: null,
        },
      });
      this.activeContests.set(labels, activeContestsCount);

      // Total contestants
      const contestantsCount = await this.prisma.contestant.count({
        where: {
          tenantId,
        },
      });
      this.totalContestants.set(labels, contestantsCount);

      // Total judges
      const judgesCount = await this.prisma.judge.count({
        where: {
          tenantId,
        },
      });
      this.totalJudges.set(labels, judgesCount);

      // Assigned judges (judges with at least one assignment)
      const assignedJudgesCount = await this.prisma.judge.count({
        where: {
          tenantId,
          assignments: {
            some: {},
          },
        },
      });
      this.assignedJudges.set(labels, assignedJudgesCount);

      // Total scores
      const scoresCount = await this.prisma.score.count({
        where: {
          judge: {
            tenantId,
          },
        },
      });
      this.totalScores.set(labels, scoresCount);

      // Scores in last 24 hours
      const recentThreshold = new Date();
      recentThreshold.setHours(recentThreshold.getHours() - 24);
      const recentScoresCount = await this.prisma.score.count({
        where: {
          judge: {
            tenantId,
          },
          createdAt: {
            gte: recentThreshold,
          },
        },
      });
      this.scoresLast24h.set(labels, recentScoresCount);

      // Active users
      const activeUsersCount = await this.prisma.user.count({
        where: {
          tenantId,
          isActive: true,
        },
      });
      this.activeUsers.set(labels, activeUsersCount);

      const recentUsers24hCount = await this.prisma.user.count({
        where: {
          tenantId,
          isActive: true,
          lastLoginAt: {
            gte: recentThreshold,
          },
        },
      });
      this.recentUsers24h.set(labels, recentUsers24hCount);

      // Users by role
      const usersByRole = await this.prisma.user.groupBy({
        by: ['role'],
        where: {
          tenantId,
          isActive: true,
        },
        _count: true,
      });

      usersByRole.forEach(group => {
        this.usersByRole.set(
          { ...labels, role: group.role },
          group._count
        );
      });

      for (const role of USER_ROLES) {
        const groupCount = usersByRole.find((group) => group.role === role)?._count || 0;
        this.usersByRole.set({ ...labels, role }, groupCount);
      }

      const recentUsersByRole = await this.prisma.user.groupBy({
        by: ['role'],
        where: {
          tenantId,
          isActive: true,
          lastLoginAt: {
            gte: recentThreshold,
          },
        },
        _count: true,
      });

      for (const role of USER_ROLES) {
        const groupCount = recentUsersByRole.find((group) => group.role === role)?._count || 0;
        this.recentUsers24hByRole.set({ ...labels, role }, groupCount);
      }

      // Events by status (using archived field as proxy for status)
      const archivedEvents = await this.prisma.event.count({
        where: { tenantId, archived: true, deletedAt: null },
      });
      const activeNonArchivedEvents = await this.prisma.event.count({
        where: { tenantId, archived: false, deletedAt: null },
      });

      this.eventsByStatus.set(
        { ...labels, status: 'active' },
        activeNonArchivedEvents
      );
      this.eventsByStatus.set(
        { ...labels, status: 'archived' },
        archivedEvents
      );

      // Average contests per event
      if (activeEventsCount > 0) {
        const avgContestsPerEvent = activeContestsCount / activeEventsCount;
        this.contestsByEvent.set(labels, avgContestsPerEvent);
      } else {
        this.contestsByEvent.set(labels, 0);
      }

      // Average categories per contest
      const categoriesCount = await this.prisma.category.count({
        where: {
          contest: {
            event: { tenantId },
          },
          deletedAt: null,
        },
      });

      if (activeContestsCount > 0) {
        const avgCategoriesPerContest = categoriesCount / activeContestsCount;
        this.categoriesByContest.set(labels, avgCategoriesPerContest);
      } else {
        this.categoriesByContest.set(labels, 0);
      }

      // Pending certifications
      const pendingJudgeCerts = await this.prisma.certification.count({
        where: {
          tenantId,
          status: 'PENDING',
        },
      });

      this.pendingCertifications.set(
        { ...labels, type: 'judge' },
        pendingJudgeCerts
      );

      // Count events by effective scoring type
      // Events with explicit scoringType
      const eventsWithExplicitType = await this.prisma.event.groupBy({
        by: ['scoringType'],
        where: {
          tenantId,
          deletedAt: null,
          scoringType: { not: null },
        },
        _count: true,
      });

      eventsWithExplicitType.forEach(group => {
        if (group.scoringType) {
          this.eventsByScoringType.set(
            { ...labels, scoring_type: group.scoringType },
            group._count
          );
        }
      });

      // Events that inherit from tenant (scoringType is null)
      const eventsInheritingCount = await this.prisma.event.count({
        where: {
          tenantId,
          deletedAt: null,
          scoringType: null,
        },
      });

      if (eventsInheritingCount > 0) {
        // These events inherit tenant's scoring type
        const existingCount = eventsWithExplicitType.find(
          g => g.scoringType === tenant.scoringType
        )?._count || 0;
        this.eventsByScoringType.set(
          { ...labels, scoring_type: tenant.scoringType },
          existingCount + eventsInheritingCount
        );
      }

      // Count contests by effective scoring type
      // This is more complex as contests can inherit from event or tenant
      // First, get contests with explicit scoringType
      const contestsWithExplicitType = await this.prisma.contest.groupBy({
        by: ['scoringType'],
        where: {
          event: { tenantId },
          deletedAt: null,
          scoringType: { not: null },
        },
        _count: true,
      });

      contestsWithExplicitType.forEach(group => {
        if (group.scoringType) {
          this.contestsByScoringType.set(
            { ...labels, scoring_type: group.scoringType },
            group._count
          );
        }
      });

      // Get contests that inherit from event or tenant
      const contestsInheriting = await this.prisma.contest.findMany({
        where: {
          event: { tenantId },
          deletedAt: null,
          scoringType: null,
        },
        select: {
          id: true,
          event: {
            select: {
              scoringType: true,
            },
          },
        },
      });

      // Group inherited contests by effective scoring type
      const inheritedCounts: { [key: string]: number } = {};
      contestsInheriting.forEach(contest => {
        const effectiveType = contest.event.scoringType || tenant.scoringType || 'STRAIGHT';
        inheritedCounts[effectiveType] = (inheritedCounts[effectiveType] || 0) + 1;
      });

      // Add inherited counts to explicit counts
      Object.entries(inheritedCounts).forEach(([scoringType, count]) => {
        const existingCount = contestsWithExplicitType.find(
          g => g.scoringType === scoringType
        )?._count || 0;
        this.contestsByScoringType.set(
          { ...labels, scoring_type: scoringType },
          existingCount + count
        );
      });

    } catch (error) {
      this.log.error(`Failed to collect metrics for tenant ${tenantId}:`, error);
      // Don't throw - continue collecting for other tenants
    }
  }
}

export default BusinessMetricsCollector;
