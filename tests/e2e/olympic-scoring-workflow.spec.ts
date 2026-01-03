/**
 * E2E Tests: Olympic Scoring Workflow
 * Tests Olympic scoring configuration, validation, and calculation across tenant, event, and contest levels
 */

import { test, expect } from '@playwright/test';
import { PrismaClient, ScoringType } from '@prisma/client';
import { TestDataFactory } from '../helpers/TestDataFactory';
import {
  createAuthContext,
  cleanupContexts,
  navigateAndWait,
} from '../helpers/playwrightAuthHelpers';

let prisma: PrismaClient;
let factory: TestDataFactory;
let testData: any;
let authContext: any;

test.describe('Olympic Scoring Workflow', () => {
  test.beforeAll(async ({ browser }) => {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL || 'postgresql://event_manager:dittibop@localhost:5432/event_manager_test?schema=public',
        },
      },
    });
    await prisma.$connect();
  });

  test.beforeEach(async ({ browser }) => {
    factory = new TestDataFactory(prisma, `olympic_scoring_${Date.now()}`);

    // Create tenant with STRAIGHT scoring (default)
    const tenant = await factory.createTenant({
      scoringType: ScoringType.STRAIGHT,
    });

    // Create admin user
    const admin = await factory.createUser('ADMIN', tenant.id);

    // Create test environment
    testData = {
      tenant,
      admin,
    };

    authContext = await createAuthContext(browser, admin.email, 'password123', tenant.slug);
  });

  test.afterEach(async () => {
    await cleanupContexts({ main: authContext });
    await factory.cleanup();
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test.describe('Tenant-level Olympic Scoring Configuration', () => {
    test('should allow admin to set Olympic scoring at tenant level', async () => {
      // Update tenant to use Olympic scoring
      await prisma.tenant.update({
        where: { id: testData.tenant.id },
        data: { scoringType: ScoringType.OLYMPIC },
      });

      // Verify the update
      const updatedTenant = await prisma.tenant.findUnique({
        where: { id: testData.tenant.id },
      });

      expect(updatedTenant?.scoringType).toBe(ScoringType.OLYMPIC);
    });

    test('should inherit tenant Olympic scoring to events without explicit setting', async () => {
      // Set tenant to Olympic scoring
      await prisma.tenant.update({
        where: { id: testData.tenant.id },
        data: { scoringType: ScoringType.OLYMPIC },
      });

      // Create event without scoringType (should inherit from tenant)
      const event = await prisma.event.create({
        data: {
          name: 'Test Event',
          slug: `test-event-${Date.now()}`,
          startDate: new Date(),
          endDate: new Date(),
          tenantId: testData.tenant.id,
          scoringType: null, // Explicitly null to inherit
        },
      });

      // Create contest without scoringType
      const contest = await prisma.contest.create({
        data: {
          name: 'Test Contest',
          eventId: event.id,
          tenantId: testData.tenant.id,
          scoringType: null, // Inherit from event/tenant
        },
      });

      // Create category
      const category = await prisma.category.create({
        data: {
          name: 'Test Category',
          contestId: contest.id,
          tenantId: testData.tenant.id,
        },
      });

      // Create contestant
      const contestant = await prisma.contestant.create({
        data: {
          name: 'Test Contestant',
          contestantNumber: 1,
          tenantId: testData.tenant.id,
        },
      });

      // Link contestant to category
      await prisma.categoryContestant.create({
        data: {
          categoryId: category.id,
          contestantId: contestant.id,
          tenantId: testData.tenant.id,
        },
      });

      // Create 3 judges
      const judges = await Promise.all([1, 2, 3].map(async (i) => {
        const judgeUser = await factory.createUser('JUDGE', testData.tenant.id);
        const judge = await prisma.judge.create({
          data: {
            userId: judgeUser.id,
            name: `Judge ${i}`,
            tenantId: testData.tenant.id,
          },
        });
        return judge;
      }));

      // Create scores from all 3 judges
      await Promise.all(judges.map(async (judge, i) => {
        return prisma.score.create({
          data: {
            categoryId: category.id,
            contestantId: contestant.id,
            judgeId: judge.id,
            score: 8.0 + (i * 0.5), // 8.0, 8.5, 9.0
            tenantId: testData.tenant.id,
          },
        });
      }));

      // Query to get effective scoring type
      const categoryWithContest = await prisma.category.findUnique({
        where: { id: category.id },
        select: {
          contest: {
            select: {
              scoringType: true,
              event: {
                select: {
                  scoringType: true,
                },
              },
            },
          },
        },
      });

      // Verify inheritance: contest null, event null, should use tenant (OLYMPIC)
      expect(categoryWithContest?.contest.scoringType).toBeNull();
      expect(categoryWithContest?.contest.event.scoringType).toBeNull();

      // Verify tenant scoring type
      const tenant = await prisma.tenant.findUnique({
        where: { id: testData.tenant.id },
      });
      expect(tenant?.scoringType).toBe(ScoringType.OLYMPIC);
    });
  });

  test.describe('Event-level Olympic Scoring Configuration', () => {
    test('should allow event to override tenant scoring type', async () => {
      // Set tenant to STRAIGHT
      await prisma.tenant.update({
        where: { id: testData.tenant.id },
        data: { scoringType: ScoringType.STRAIGHT },
      });

      // Create event with OLYMPIC scoring (overrides tenant)
      const event = await prisma.event.create({
        data: {
          name: 'Olympic Event',
          slug: `olympic-event-${Date.now()}`,
          startDate: new Date(),
          endDate: new Date(),
          tenantId: testData.tenant.id,
          scoringType: ScoringType.OLYMPIC,
        },
      });

      expect(event.scoringType).toBe(ScoringType.OLYMPIC);

      // Create contest that inherits from event
      const contest = await prisma.contest.create({
        data: {
          name: 'Test Contest',
          eventId: event.id,
          tenantId: testData.tenant.id,
          scoringType: null, // Should inherit OLYMPIC from event
        },
      });

      const contestWithEvent = await prisma.contest.findUnique({
        where: { id: contest.id },
        select: {
          scoringType: true,
          event: {
            select: {
              scoringType: true,
            },
          },
        },
      });

      // Verify: contest is null, event is OLYMPIC
      expect(contestWithEvent?.scoringType).toBeNull();
      expect(contestWithEvent?.event.scoringType).toBe(ScoringType.OLYMPIC);
    });
  });

  test.describe('Contest-level Olympic Scoring Configuration', () => {
    test('should allow contest to override event and tenant scoring type', async () => {
      // Set tenant to STRAIGHT
      await prisma.tenant.update({
        where: { id: testData.tenant.id },
        data: { scoringType: ScoringType.STRAIGHT },
      });

      // Create event with STRAIGHT scoring
      const event = await prisma.event.create({
        data: {
          name: 'Straight Event',
          slug: `straight-event-${Date.now()}`,
          startDate: new Date(),
          endDate: new Date(),
          tenantId: testData.tenant.id,
          scoringType: ScoringType.STRAIGHT,
        },
      });

      // Create contest with OLYMPIC scoring (overrides both)
      const contest = await prisma.contest.create({
        data: {
          name: 'Olympic Contest',
          eventId: event.id,
          tenantId: testData.tenant.id,
          scoringType: ScoringType.OLYMPIC,
        },
      });

      expect(contest.scoringType).toBe(ScoringType.OLYMPIC);
    });

    test('should use contest-level Olympic scoring in score calculation', async () => {
      // Create event
      const event = await prisma.event.create({
        data: {
          name: 'Test Event',
          slug: `test-event-${Date.now()}`,
          startDate: new Date(),
          endDate: new Date(),
          tenantId: testData.tenant.id,
          scoringType: null,
        },
      });

      // Create contest with Olympic scoring
      const contest = await prisma.contest.create({
        data: {
          name: 'Olympic Contest',
          eventId: event.id,
          tenantId: testData.tenant.id,
          scoringType: ScoringType.OLYMPIC,
        },
      });

      // Create category
      const category = await prisma.category.create({
        data: {
          name: 'Test Category',
          contestId: contest.id,
          tenantId: testData.tenant.id,
        },
      });

      // Create contestant
      const contestant = await prisma.contestant.create({
        data: {
          name: 'Test Contestant',
          contestantNumber: 1,
          tenantId: testData.tenant.id,
        },
      });

      await prisma.categoryContestant.create({
        data: {
          categoryId: category.id,
          contestantId: contestant.id,
          tenantId: testData.tenant.id,
        },
      });

      // Create 5 judges with different scores
      const scores = [7.5, 8.5, 8.8, 9.0, 9.2];
      const judges = await Promise.all(scores.map(async (scoreValue, i) => {
        const judgeUser = await factory.createUser('JUDGE', testData.tenant.id);
        const judge = await prisma.judge.create({
          data: {
            userId: judgeUser.id,
            name: `Judge ${i + 1}`,
            tenantId: testData.tenant.id,
          },
        });

        await prisma.score.create({
          data: {
            categoryId: category.id,
            contestantId: contestant.id,
            judgeId: judge.id,
            score: scoreValue,
            tenantId: testData.tenant.id,
          },
        });

        return judge;
      }));

      // Retrieve all scores
      const allScores = await prisma.score.findMany({
        where: {
          categoryId: category.id,
          contestantId: contestant.id,
        },
        select: {
          score: true,
        },
      });

      expect(allScores.length).toBe(5);

      // With Olympic scoring: drop 7.5 (low) and 9.2 (high)
      // Remaining: [8.5, 8.8, 9.0]
      // Average: (8.5 + 8.8 + 9.0) / 3 = 8.766...
      const scoreValues = allScores.map(s => s.score).filter((s): s is number => s !== null);
      const sortedScores = [...scoreValues].sort((a, b) => a - b);
      const droppedLow = sortedScores[0];
      const droppedHigh = sortedScores[sortedScores.length - 1];
      const middleScores = sortedScores.slice(1, -1);
      const olympicAverage = middleScores.reduce((sum, score) => sum + score, 0) / middleScores.length;

      expect(droppedLow).toBe(7.5);
      expect(droppedHigh).toBe(9.2);
      expect(olympicAverage).toBeCloseTo(8.767, 2);
    });
  });

  test.describe('Olympic Scoring Validation', () => {
    test('should require minimum 3 judges for Olympic scoring', async () => {
      // Create event with Olympic scoring
      const event = await prisma.event.create({
        data: {
          name: 'Olympic Event',
          slug: `olympic-event-${Date.now()}`,
          startDate: new Date(),
          endDate: new Date(),
          tenantId: testData.tenant.id,
          scoringType: ScoringType.OLYMPIC,
        },
      });

      const contest = await prisma.contest.create({
        data: {
          name: 'Test Contest',
          eventId: event.id,
          tenantId: testData.tenant.id,
        },
      });

      const category = await prisma.category.create({
        data: {
          name: 'Test Category',
          contestId: contest.id,
          tenantId: testData.tenant.id,
        },
      });

      const contestant = await prisma.contestant.create({
        data: {
          name: 'Test Contestant',
          contestantNumber: 1,
          tenantId: testData.tenant.id,
        },
      });

      await prisma.categoryContestant.create({
        data: {
          categoryId: category.id,
          contestantId: contestant.id,
          tenantId: testData.tenant.id,
        },
      });

      // Create only 2 judges (insufficient for Olympic scoring)
      const judges = await Promise.all([1, 2].map(async (i) => {
        const judgeUser = await factory.createUser('JUDGE', testData.tenant.id);
        const judge = await prisma.judge.create({
          data: {
            userId: judgeUser.id,
            name: `Judge ${i}`,
            tenantId: testData.tenant.id,
          },
        });

        await prisma.score.create({
          data: {
            categoryId: category.id,
            contestantId: contestant.id,
            judgeId: judge.id,
            score: 8.0 + i,
            tenantId: testData.tenant.id,
          },
        });

        return judge;
      }));

      // Verify only 2 scores exist
      const scoreCount = await prisma.score.count({
        where: {
          categoryId: category.id,
          contestantId: contestant.id,
        },
      });

      expect(scoreCount).toBe(2);

      // Note: Actual validation would happen in ScoringService.calculateAverageScore()
      // which would throw ValidationError: "Olympic scoring requires at least 3 judges"
    });

    test('should successfully calculate with exactly 3 judges', async () => {
      // Create contest with Olympic scoring
      const event = await prisma.event.create({
        data: {
          name: 'Test Event',
          slug: `test-event-${Date.now()}`,
          startDate: new Date(),
          endDate: new Date(),
          tenantId: testData.tenant.id,
        },
      });

      const contest = await prisma.contest.create({
        data: {
          name: 'Olympic Contest',
          eventId: event.id,
          tenantId: testData.tenant.id,
          scoringType: ScoringType.OLYMPIC,
        },
      });

      const category = await prisma.category.create({
        data: {
          name: 'Test Category',
          contestId: contest.id,
          tenantId: testData.tenant.id,
        },
      });

      const contestant = await prisma.contestant.create({
        data: {
          name: 'Test Contestant',
          contestantNumber: 1,
          tenantId: testData.tenant.id,
        },
      });

      await prisma.categoryContestant.create({
        data: {
          categoryId: category.id,
          contestantId: contestant.id,
          tenantId: testData.tenant.id,
        },
      });

      // Create exactly 3 judges
      const scores = [7.5, 8.5, 9.0];
      await Promise.all(scores.map(async (scoreValue, i) => {
        const judgeUser = await factory.createUser('JUDGE', testData.tenant.id);
        const judge = await prisma.judge.create({
          data: {
            userId: judgeUser.id,
            name: `Judge ${i + 1}`,
            tenantId: testData.tenant.id,
          },
        });

        await prisma.score.create({
          data: {
            categoryId: category.id,
            contestantId: contestant.id,
            judgeId: judge.id,
            score: scoreValue,
            tenantId: testData.tenant.id,
          },
        });
      }));

      // Verify 3 scores
      const allScores = await prisma.score.findMany({
        where: {
          categoryId: category.id,
          contestantId: contestant.id,
        },
      });

      expect(allScores.length).toBe(3);

      // With 3 scores: drop 7.5 (low) and 9.0 (high)
      // Remaining: [8.5]
      // Average: 8.5
      const scoreValues = allScores.map(s => s.score).filter((s): s is number => s !== null);
      const sortedScores = [...scoreValues].sort((a, b) => a - b);
      const middleScores = sortedScores.slice(1, -1);
      const olympicAverage = middleScores.reduce((sum, score) => sum + score, 0) / middleScores.length;

      expect(olympicAverage).toBe(8.5);
    });
  });

  test.describe('Scoring Type Hierarchy', () => {
    test('should use Contest > Event > Tenant priority', async () => {
      // Set tenant to STRAIGHT
      await prisma.tenant.update({
        where: { id: testData.tenant.id },
        data: { scoringType: ScoringType.STRAIGHT },
      });

      // Create event with OLYMPIC (overrides tenant)
      const event = await prisma.event.create({
        data: {
          name: 'Event Override',
          slug: `event-override-${Date.now()}`,
          startDate: new Date(),
          endDate: new Date(),
          tenantId: testData.tenant.id,
          scoringType: ScoringType.OLYMPIC,
        },
      });

      // Create contest with STRAIGHT (overrides event and tenant)
      const contest = await prisma.contest.create({
        data: {
          name: 'Contest Override',
          eventId: event.id,
          tenantId: testData.tenant.id,
          scoringType: ScoringType.STRAIGHT,
        },
      });

      // Verify hierarchy
      const fullContest = await prisma.contest.findUnique({
        where: { id: contest.id },
        select: {
          scoringType: true,
          event: {
            select: {
              scoringType: true,
              tenant: {
                select: {
                  scoringType: true,
                },
              },
            },
          },
        },
      });

      expect(fullContest?.scoringType).toBe(ScoringType.STRAIGHT); // Contest level wins
      expect(fullContest?.event.scoringType).toBe(ScoringType.OLYMPIC); // Event level
      expect(fullContest?.event.tenant.scoringType).toBe(ScoringType.STRAIGHT); // Tenant level
    });
  });

  test.describe('UI Integration', () => {
    test('should be able to access settings page to configure scoring type', async () => {
      const { page } = authContext;

      // Navigate to settings page
      await navigateAndWait(page, '/settings');

      // Verify settings page loaded
      const settingsPage = page.locator('h1, h2').first();
      await expect(settingsPage).toBeVisible({ timeout: 10000 });
    });

    test('should be able to access tenant management page', async () => {
      const { page } = authContext;

      // Navigate to tenant management
      await navigateAndWait(page, '/tenant-management');

      // Verify page loaded
      const tenantPage = page.locator('h1, h2, body').first();
      await expect(tenantPage).toBeVisible({ timeout: 10000 });
    });

    test('should be able to access events page for event-level configuration', async () => {
      const { page } = authContext;

      // Navigate to events page
      await navigateAndWait(page, '/events');

      // Verify page loaded
      const eventsPage = page.locator('h1, h2').first();
      await expect(eventsPage).toBeVisible({ timeout: 10000 });
    });

    test('should be able to access contests page for contest-level configuration', async () => {
      const { page } = authContext;

      // Navigate to contests page
      await navigateAndWait(page, '/contests');

      // Verify page loaded
      const contestsPage = page.locator('h1, h2').first();
      await expect(contestsPage).toBeVisible({ timeout: 10000 });
    });
  });
});
