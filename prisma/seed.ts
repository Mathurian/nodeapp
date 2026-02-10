/**
 * Database Seed Script for Event Manager
 *
 * Creates realistic test data for development and testing.
 * This script is idempotent - it can be run multiple times safely.
 *
 * Usage: npx ts-node prisma/seed.ts
 *
 * Data created:
 * - 10-15 Users (various roles)
 * - 3 Events (active, upcoming, completed)
 * - 3-5 Contests per active event
 * - 2-4 Categories per contest
 * - 5-10 Contestants per category
 * - Sample scores from judges
 * - Scoring criteria
 */

import { PrismaClient, UserRole, ScoringType, ContestantNumberingMode } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Configuration
const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = 'Password123!';

// Seed identifier to make the script idempotent
const SEED_IDENTIFIER = 'seed-data-v1';

// =============================================================================
// Helper Functions
// =============================================================================

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper function for future use
function _randomElement<T>(array: T[]): T {
  const element = array[Math.floor(Math.random() * array.length)];
  if (element === undefined) {
    throw new Error('Array is empty');
  }
  return element;
}
void _randomElement; // Suppress unused warning

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j]!;
    shuffled[j] = temp!;
  }
  return shuffled;
}

// =============================================================================
// Seed Data Definitions
// =============================================================================

interface UserSeedData {
  name: string;
  email: string;
  role: UserRole;
  isSuperAdmin?: boolean;
  preferredName?: string;
}

const usersToCreate: UserSeedData[] = [
  // Super Admin
  { name: 'System Administrator', email: 'superadmin@eventmanager.dev', role: UserRole.SUPER_ADMIN, isSuperAdmin: true },

  // Tenant Admins
  { name: 'Emily Chen', email: 'emily.chen@eventmanager.dev', role: UserRole.ADMIN, preferredName: 'Emily' },
  { name: 'Michael Thompson', email: 'michael.thompson@eventmanager.dev', role: UserRole.ADMIN, preferredName: 'Mike' },

  // Event Administrators (Organizers)
  { name: 'Sarah Martinez', email: 'sarah.martinez@eventmanager.dev', role: UserRole.ORGANIZER, preferredName: 'Sarah' },
  { name: 'David Wilson', email: 'david.wilson@eventmanager.dev', role: UserRole.ORGANIZER, preferredName: 'Dave' },
  { name: 'Jennifer Lee', email: 'jennifer.lee@eventmanager.dev', role: UserRole.ORGANIZER, preferredName: 'Jen' },

  // Tally Masters
  { name: 'Robert Brown', email: 'robert.brown@eventmanager.dev', role: UserRole.TALLY_MASTER, preferredName: 'Rob' },
  { name: 'Lisa Anderson', email: 'lisa.anderson@eventmanager.dev', role: UserRole.TALLY_MASTER, preferredName: 'Lisa' },

  // Auditors
  { name: 'James Taylor', email: 'james.taylor@eventmanager.dev', role: UserRole.AUDITOR, preferredName: 'Jim' },
  { name: 'Amanda White', email: 'amanda.white@eventmanager.dev', role: UserRole.AUDITOR, preferredName: 'Mandy' },

  // Board Member
  { name: 'Patricia Johnson', email: 'patricia.johnson@eventmanager.dev', role: UserRole.BOARD, preferredName: 'Pat' },

  // Judges
  { name: 'Dr. William Harris', email: 'william.harris@eventmanager.dev', role: UserRole.JUDGE, preferredName: 'Bill' },
  { name: 'Maria Garcia', email: 'maria.garcia@eventmanager.dev', role: UserRole.JUDGE },
  { name: 'Christopher Davis', email: 'christopher.davis@eventmanager.dev', role: UserRole.JUDGE, preferredName: 'Chris' },
  { name: 'Elizabeth Moore', email: 'elizabeth.moore@eventmanager.dev', role: UserRole.JUDGE, preferredName: 'Liz' },
  { name: 'Thomas Jackson', email: 'thomas.jackson@eventmanager.dev', role: UserRole.JUDGE, preferredName: 'Tom' },
];

interface EventSeedData {
  name: string;
  description: string;
  status: 'active' | 'upcoming' | 'completed';
  location: string;
  scoringType: ScoringType;
}

const eventsToCreate: EventSeedData[] = [
  {
    name: 'Annual Talent Showcase 2026',
    description: 'Our flagship annual talent competition featuring performers from across the region. Categories include vocal performance, dance, instrumental, and creative arts.',
    status: 'active',
    location: 'Grand Convention Center, Main Hall',
    scoringType: ScoringType.STRAIGHT,
  },
  {
    name: 'Spring Music Festival 2026',
    description: 'A celebration of musical talent featuring solo and group performances across multiple genres.',
    status: 'upcoming',
    location: 'City Arts Center',
    scoringType: ScoringType.OLYMPIC,
  },
  {
    name: 'Winter Showcase 2025',
    description: 'The previous year\'s winter showcase competition. All categories have been judged and winners announced.',
    status: 'completed',
    location: 'Metropolitan Theater',
    scoringType: ScoringType.STRAIGHT,
  },
];

interface ContestSeedData {
  name: string;
  description: string;
  scoringType?: ScoringType;
}

const contestsForActiveEvent: ContestSeedData[] = [
  {
    name: 'Vocal Performance',
    description: 'Solo and duo vocal performances judged on technique, expression, and stage presence.',
    scoringType: ScoringType.STRAIGHT,
  },
  {
    name: 'Dance Competition',
    description: 'Individual and group dance performances across various styles including contemporary, hip-hop, and classical.',
    scoringType: ScoringType.OLYMPIC,
  },
  {
    name: 'Instrumental Showcase',
    description: 'Solo instrumental performances featuring various instruments and musical genres.',
    scoringType: ScoringType.STRAIGHT,
  },
  {
    name: 'Creative Arts',
    description: 'Visual arts, spoken word, and other creative performances.',
  },
];

const contestsForCompletedEvent: ContestSeedData[] = [
  {
    name: 'Winter Vocal Competition',
    description: 'Holiday-themed vocal performances.',
    scoringType: ScoringType.STRAIGHT,
  },
  {
    name: 'Dance Showcase',
    description: 'Winter dance performances.',
  },
];

interface CategorySeedData {
  name: string;
  description: string;
  scoreCap?: number;
  timeLimit?: number;
}

const categoriesPerContest: Record<string, CategorySeedData[]> = {
  'Vocal Performance': [
    { name: 'Solo Classical', description: 'Classical vocal solos including opera and art songs', scoreCap: 100, timeLimit: 5 },
    { name: 'Solo Contemporary', description: 'Contemporary and popular music vocal performances', scoreCap: 100, timeLimit: 4 },
    { name: 'Duet Performance', description: 'Two-person vocal performances in any style', scoreCap: 100, timeLimit: 5 },
  ],
  'Dance Competition': [
    { name: 'Contemporary Solo', description: 'Individual contemporary dance performances', scoreCap: 100, timeLimit: 4 },
    { name: 'Hip-Hop Group', description: 'Group hip-hop dance performances (2-8 dancers)', scoreCap: 100, timeLimit: 5 },
    { name: 'Classical Ballet', description: 'Classical ballet solo or pas de deux', scoreCap: 100, timeLimit: 4 },
    { name: 'Open Style', description: 'Any dance style not covered by other categories', scoreCap: 100, timeLimit: 4 },
  ],
  'Instrumental Showcase': [
    { name: 'Piano Solo', description: 'Solo piano performances', scoreCap: 100, timeLimit: 6 },
    { name: 'String Instruments', description: 'Violin, cello, guitar, and other string instruments', scoreCap: 100, timeLimit: 5 },
    { name: 'Wind & Brass', description: 'Woodwind and brass instrument performances', scoreCap: 100, timeLimit: 5 },
  ],
  'Creative Arts': [
    { name: 'Spoken Word', description: 'Original poetry and spoken word performances', scoreCap: 100, timeLimit: 4 },
    { name: 'Dramatic Monologue', description: 'Acting performances featuring monologues', scoreCap: 100, timeLimit: 5 },
  ],
  'Winter Vocal Competition': [
    { name: 'Holiday Songs', description: 'Traditional and contemporary holiday songs', scoreCap: 100, timeLimit: 4 },
    { name: 'Winter Ballads', description: 'Winter-themed ballads and slow songs', scoreCap: 100, timeLimit: 5 },
  ],
  'Dance Showcase': [
    { name: 'Winter Dance', description: 'Winter-themed dance performances', scoreCap: 100, timeLimit: 4 },
  ],
};

interface CriteriaSeedData {
  name: string;
  maxScore: number;
}

const defaultCriteria: CriteriaSeedData[] = [
  { name: 'Technical Skill', maxScore: 30 },
  { name: 'Artistic Expression', maxScore: 25 },
  { name: 'Stage Presence', maxScore: 20 },
  { name: 'Originality', maxScore: 15 },
  { name: 'Overall Impact', maxScore: 10 },
];

interface ContestantSeedData {
  name: string;
  email: string;
  gender?: string;
  bio?: string;
}

const contestantPool: ContestantSeedData[] = [
  { name: 'Sophia Williams', email: 'sophia.williams@example.com', gender: 'Female', bio: 'Classically trained vocalist with 10 years of experience.' },
  { name: 'Ethan Brown', email: 'ethan.brown@example.com', gender: 'Male', bio: 'Contemporary dancer specializing in hip-hop and street dance.' },
  { name: 'Olivia Jones', email: 'olivia.jones@example.com', gender: 'Female', bio: 'Multi-instrumentalist focusing on piano and violin.' },
  { name: 'Liam Miller', email: 'liam.miller@example.com', gender: 'Male', bio: 'Singer-songwriter with original compositions.' },
  { name: 'Ava Davis', email: 'ava.davis@example.com', gender: 'Female', bio: 'Ballet dancer trained at the Royal Academy.' },
  { name: 'Noah Garcia', email: 'noah.garcia@example.com', gender: 'Male', bio: 'Jazz pianist with a passion for improvisation.' },
  { name: 'Isabella Martinez', email: 'isabella.martinez@example.com', gender: 'Female', bio: 'Spoken word artist and poet.' },
  { name: 'Mason Rodriguez', email: 'mason.rodriguez@example.com', gender: 'Male', bio: 'Contemporary vocalist with gospel influences.' },
  { name: 'Mia Wilson', email: 'mia.wilson@example.com', gender: 'Female', bio: 'Hip-hop dancer and choreographer.' },
  { name: 'Lucas Anderson', email: 'lucas.anderson@example.com', gender: 'Male', bio: 'Classical guitarist with competition experience.' },
  { name: 'Charlotte Thomas', email: 'charlotte.thomas@example.com', gender: 'Female', bio: 'Opera singer pursuing a career in classical music.' },
  { name: 'Henry Jackson', email: 'henry.jackson@example.com', gender: 'Male', bio: 'Drummer and percussionist.' },
  { name: 'Amelia White', email: 'amelia.white@example.com', gender: 'Female', bio: 'Modern dance performer with contemporary training.' },
  { name: 'Alexander Harris', email: 'alexander.harris@example.com', gender: 'Male', bio: 'Saxophonist specializing in jazz and blues.' },
  { name: 'Harper Clark', email: 'harper.clark@example.com', gender: 'Female', bio: 'Musical theater performer.' },
  { name: 'Benjamin Lewis', email: 'benjamin.lewis@example.com', gender: 'Male', bio: 'Folk singer and guitarist.' },
  { name: 'Evelyn Walker', email: 'evelyn.walker@example.com', gender: 'Female', bio: 'Contemporary vocalist with R&B influences.' },
  { name: 'Daniel Hall', email: 'daniel.hall@example.com', gender: 'Male', bio: 'Breakdancer and street performer.' },
  { name: 'Abigail Young', email: 'abigail.young@example.com', gender: 'Female', bio: 'Flutist with orchestral experience.' },
  { name: 'Matthew King', email: 'matthew.king@example.com', gender: 'Male', bio: 'Actor specializing in dramatic monologues.' },
];

interface JudgeSeedData {
  name: string;
  email: string;
  gender?: string;
  bio?: string;
  isHeadJudge?: boolean;
}

const judgesToCreate: JudgeSeedData[] = [
  { name: 'Dr. William Harris', email: 'william.harris@eventmanager.dev', gender: 'Male', bio: 'Professor of Music with 20 years of judging experience.', isHeadJudge: true },
  { name: 'Maria Garcia', email: 'maria.garcia@eventmanager.dev', gender: 'Female', bio: 'Professional choreographer and dance instructor.' },
  { name: 'Christopher Davis', email: 'christopher.davis@eventmanager.dev', gender: 'Male', bio: 'Former Broadway performer and vocal coach.' },
  { name: 'Elizabeth Moore', email: 'elizabeth.moore@eventmanager.dev', gender: 'Female', bio: 'Renowned pianist and music educator.' },
  { name: 'Thomas Jackson', email: 'thomas.jackson@eventmanager.dev', gender: 'Male', bio: 'Theater director with extensive performance experience.' },
];

// =============================================================================
// Main Seeding Functions
// =============================================================================

async function getOrCreateTenant() {
  console.log('Getting or creating tenant...');

  // Check for existing tenant
  let tenant = await prisma.tenant.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  });

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: 'Default Organization',
        slug: 'default',
        isActive: true,
        planType: 'enterprise',
        subscriptionStatus: 'active',
        scoringType: ScoringType.STRAIGHT,
        settings: {
          seedIdentifier: SEED_IDENTIFIER,
          seededAt: new Date().toISOString(),
        },
      },
    });
    console.log(`  Created tenant: ${tenant.name}`);
  } else {
    console.log(`  Using existing tenant: ${tenant.name}`);
  }

  return tenant;
}

async function seedUsers(tenantId: string) {
  console.log('Seeding users...');

  const hashedPassword = await hashPassword(DEFAULT_PASSWORD);
  const createdUsers: { id: string; email: string; role: UserRole }[] = [];

  for (const userData of usersToCreate) {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email: userData.email } },
    });

    if (existingUser) {
      console.log(`  Skipping existing user: ${userData.email}`);
      createdUsers.push({ id: existingUser.id, email: existingUser.email, role: existingUser.role });
      continue;
    }

    const user = await prisma.user.create({
      data: {
        tenantId,
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        role: userData.role,
        isSuperAdmin: userData.isSuperAdmin || false,
        preferredName: userData.preferredName,
        isActive: true,
      },
    });

    console.log(`  Created user: ${user.email} (${user.role})`);
    createdUsers.push({ id: user.id, email: user.email, role: user.role });
  }

  return createdUsers;
}

async function seedJudges(tenantId: string) {
  console.log('Seeding judges...');

  const createdJudges: { id: string; email: string; name: string; isHeadJudge: boolean }[] = [];

  for (const judgeData of judgesToCreate) {
    // Check if judge already exists
    const existingJudge = await prisma.judge.findUnique({
      where: { tenantId_email: { tenantId, email: judgeData.email } },
    });

    if (existingJudge) {
      console.log(`  Skipping existing judge: ${judgeData.email}`);
      createdJudges.push({
        id: existingJudge.id,
        email: existingJudge.email || '',
        name: existingJudge.name,
        isHeadJudge: existingJudge.isHeadJudge,
      });
      continue;
    }

    const judge = await prisma.judge.create({
      data: {
        tenantId,
        name: judgeData.name,
        email: judgeData.email,
        gender: judgeData.gender,
        bio: judgeData.bio,
        isHeadJudge: judgeData.isHeadJudge || false,
      },
    });

    console.log(`  Created judge: ${judge.name}${judge.isHeadJudge ? ' (Head Judge)' : ''}`);
    createdJudges.push({
      id: judge.id,
      email: judge.email || '',
      name: judge.name,
      isHeadJudge: judge.isHeadJudge,
    });
  }

  // Link judges to users with JUDGE role
  const judgeUsers = await prisma.user.findMany({
    where: { tenantId, role: UserRole.JUDGE },
  });

  for (const user of judgeUsers) {
    const matchingJudge = createdJudges.find(j => j.email === user.email);
    if (matchingJudge && !user.judgeId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { judgeId: matchingJudge.id },
      });
      console.log(`  Linked judge ${matchingJudge.name} to user ${user.email}`);
    }
  }

  return createdJudges;
}

async function seedContestants(tenantId: string) {
  console.log('Seeding contestants...');

  const createdContestants: { id: string; email: string; name: string; contestantNumber: number }[] = [];

  let contestantNumber = 100;
  for (const contestantData of contestantPool) {
    // Check if contestant already exists
    const existingContestant = await prisma.contestant.findUnique({
      where: { tenantId_email: { tenantId, email: contestantData.email } },
    });

    if (existingContestant) {
      console.log(`  Skipping existing contestant: ${contestantData.email}`);
      createdContestants.push({
        id: existingContestant.id,
        email: existingContestant.email || '',
        name: existingContestant.name,
        contestantNumber: existingContestant.contestantNumber || contestantNumber,
      });
      contestantNumber++;
      continue;
    }

    const contestant = await prisma.contestant.create({
      data: {
        tenantId,
        name: contestantData.name,
        email: contestantData.email,
        gender: contestantData.gender,
        bio: contestantData.bio,
        contestantNumber: contestantNumber,
      },
    });

    console.log(`  Created contestant: ${contestant.name} (#${contestantNumber})`);
    createdContestants.push({
      id: contestant.id,
      email: contestant.email || '',
      name: contestant.name,
      contestantNumber: contestantNumber,
    });
    contestantNumber++;
  }

  return createdContestants;
}

async function seedEvents(tenantId: string) {
  console.log('Seeding events...');

  const createdEvents: { id: string; name: string; status: string }[] = [];
  const now = new Date();

  for (const eventData of eventsToCreate) {
    // Check if event already exists by name and tenant
    const existingEvent = await prisma.event.findFirst({
      where: { tenantId, name: eventData.name },
    });

    if (existingEvent) {
      console.log(`  Skipping existing event: ${eventData.name}`);
      createdEvents.push({ id: existingEvent.id, name: existingEvent.name, status: eventData.status });
      continue;
    }

    let startDate: Date;
    let endDate: Date;

    switch (eventData.status) {
      case 'active':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // Started 7 days ago
        endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Ends in 7 days
        break;
      case 'upcoming':
        startDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // Starts in 30 days
        endDate = new Date(now.getTime() + 37 * 24 * 60 * 60 * 1000); // Ends in 37 days
        break;
      case 'completed':
        startDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000); // Started 60 days ago
        endDate = new Date(now.getTime() - 53 * 24 * 60 * 60 * 1000); // Ended 53 days ago
        break;
      default:
        startDate = now;
        endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    const event = await prisma.event.create({
      data: {
        tenantId,
        name: eventData.name,
        description: eventData.description,
        startDate,
        endDate,
        location: eventData.location,
        scoringType: eventData.scoringType,
        contestantNumberingMode: ContestantNumberingMode.AUTO_INDEXED,
        archived: eventData.status === 'completed',
        isLocked: eventData.status === 'completed',
        lockedAt: eventData.status === 'completed' ? endDate : null,
      },
    });

    console.log(`  Created event: ${event.name} (${eventData.status})`);
    createdEvents.push({ id: event.id, name: event.name, status: eventData.status });
  }

  return createdEvents;
}

async function seedContestsAndCategories(
  tenantId: string,
  events: { id: string; name: string; status: string }[],
  judges: { id: string; name: string }[],
  contestants: { id: string; name: string }[]
) {
  console.log('Seeding contests and categories...');

  const createdCategories: { id: string; name: string; contestId: string; eventStatus: string }[] = [];

  for (const event of events) {
    const contestsToUse = event.status === 'completed' ? contestsForCompletedEvent : contestsForActiveEvent;

    // Skip upcoming events - they shouldn't have contests yet
    if (event.status === 'upcoming') {
      console.log(`  Skipping contests for upcoming event: ${event.name}`);
      continue;
    }

    for (const contestData of contestsToUse) {
      // Check if contest already exists
      const existingContest = await prisma.contest.findFirst({
        where: { tenantId, eventId: event.id, name: contestData.name },
      });

      let contestId: string;
      if (existingContest) {
        console.log(`  Skipping existing contest: ${contestData.name}`);
        contestId = existingContest.id;
      } else {
        const contest = await prisma.contest.create({
          data: {
            tenantId,
            eventId: event.id,
            name: contestData.name,
            description: contestData.description,
            scoringType: contestData.scoringType,
            contestantNumberingMode: ContestantNumberingMode.AUTO_INDEXED,
            archived: event.status === 'completed',
            isLocked: event.status === 'completed',
            winnersPublished: event.status === 'completed',
            publishedAt: event.status === 'completed' ? new Date() : null,
          },
        });
        console.log(`    Created contest: ${contest.name}`);
        contestId = contest.id;

        // Assign judges to contest
        const shuffledJudges = shuffleArray(judges);
        const judgesToAssign = shuffledJudges.slice(0, Math.min(4, judges.length));

        for (const judge of judgesToAssign) {
          const existingContestJudge = await prisma.contestJudge.findUnique({
            where: { contestId_judgeId: { contestId, judgeId: judge.id } },
          });

          if (!existingContestJudge) {
            await prisma.contestJudge.create({
              data: { tenantId, contestId, judgeId: judge.id },
            });
          }
        }
      }

      // Create categories for this contest
      const categoryDefs = categoriesPerContest[contestData.name] || [];
      for (const categoryData of categoryDefs) {
        // Check if category already exists
        const existingCategory = await prisma.category.findFirst({
          where: { tenantId, contestId, name: categoryData.name },
        });

        if (existingCategory) {
          console.log(`      Skipping existing category: ${categoryData.name}`);
          createdCategories.push({
            id: existingCategory.id,
            name: existingCategory.name,
            contestId,
            eventStatus: event.status,
          });
          continue;
        }

        const category = await prisma.category.create({
          data: {
            tenantId,
            contestId,
            name: categoryData.name,
            description: categoryData.description,
            scoreCap: categoryData.scoreCap,
            timeLimit: categoryData.timeLimit,
            totalsCertified: event.status === 'completed',
            boardApproved: event.status === 'completed',
            approvedAt: event.status === 'completed' ? new Date() : null,
          },
        });
        console.log(`      Created category: ${category.name}`);

        createdCategories.push({
          id: category.id,
          name: category.name,
          contestId,
          eventStatus: event.status,
        });

        // Create criteria for this category
        for (const criteriaData of defaultCriteria) {
          const existingCriterion = await prisma.criterion.findFirst({
            where: { tenantId, categoryId: category.id, name: criteriaData.name },
          });

          if (!existingCriterion) {
            await prisma.criterion.create({
              data: {
                tenantId,
                categoryId: category.id,
                name: criteriaData.name,
                maxScore: criteriaData.maxScore,
              },
            });
          }
        }

        // Assign judges to category
        const shuffledJudges = shuffleArray(judges);
        const judgesToAssign = shuffledJudges.slice(0, Math.min(3, judges.length));

        for (const judge of judgesToAssign) {
          const existingCategoryJudge = await prisma.categoryJudge.findUnique({
            where: { categoryId_judgeId: { categoryId: category.id, judgeId: judge.id } },
          });

          if (!existingCategoryJudge) {
            await prisma.categoryJudge.create({
              data: { tenantId, categoryId: category.id, judgeId: judge.id },
            });
          }
        }

        // Assign contestants to category (5-10 per category)
        const shuffledContestants = shuffleArray(contestants);
        const numContestants = randomInt(5, Math.min(10, contestants.length));
        const contestantsToAssign = shuffledContestants.slice(0, numContestants);

        for (const contestant of contestantsToAssign) {
          const existingCategoryContestant = await prisma.categoryContestant.findUnique({
            where: { categoryId_contestantId: { categoryId: category.id, contestantId: contestant.id } },
          });

          if (!existingCategoryContestant) {
            await prisma.categoryContestant.create({
              data: { tenantId, categoryId: category.id, contestantId: contestant.id },
            });
          }
        }
      }
    }
  }

  return createdCategories;
}

async function seedScores(
  tenantId: string,
  categories: { id: string; name: string; contestId: string; eventStatus: string }[]
) {
  console.log('Seeding scores...');

  for (const category of categories) {
    // Get judges and contestants for this category
    const categoryJudges = await prisma.categoryJudge.findMany({
      where: { categoryId: category.id },
      include: { judge: true },
    });

    const categoryContestants = await prisma.categoryContestant.findMany({
      where: { categoryId: category.id },
      include: { contestant: true },
    });

    const criteria = await prisma.criterion.findMany({
      where: { categoryId: category.id },
    });

    // Check if scores already exist for this category
    const existingScores = await prisma.score.count({
      where: { categoryId: category.id },
    });

    if (existingScores > 0) {
      console.log(`  Skipping scores for category: ${category.name} (already has ${existingScores} scores)`);
      continue;
    }

    console.log(`  Creating scores for category: ${category.name}`);

    // Only create scores for active and completed events
    if (category.eventStatus === 'upcoming') {
      continue;
    }

    // Determine certification status based on event status
    const shouldCertify = category.eventStatus === 'completed' ||
                         (category.eventStatus === 'active' && Math.random() > 0.5);

    for (const categoryJudge of categoryJudges) {
      for (const categoryContestant of categoryContestants) {
        // For active events, randomly skip some scores to simulate in-progress judging
        if (category.eventStatus === 'active' && Math.random() > 0.8) {
          continue;
        }

        for (const criterion of criteria) {
          // Generate a realistic score (normally distributed around 75-85% of max)
          const baseScore = criterion.maxScore * (0.65 + Math.random() * 0.3);
          const score = Math.round(Math.min(criterion.maxScore, Math.max(0, baseScore)));

          try {
            await prisma.score.create({
              data: {
                tenantId,
                categoryId: category.id,
                contestantId: categoryContestant.contestantId,
                judgeId: categoryJudge.judgeId,
                criterionId: criterion.id,
                score,
                isCertified: shouldCertify,
                certifiedAt: shouldCertify ? new Date() : null,
                isLocked: category.eventStatus === 'completed',
                lockedAt: category.eventStatus === 'completed' ? new Date() : null,
              },
            });
          } catch {
            // Score might already exist (unique constraint), skip silently
          }
        }
      }
    }

    // Create judge certifications for completed categories
    if (shouldCertify) {
      for (const categoryJudge of categoryJudges) {
        const existingCert = await prisma.judgeCertification.findUnique({
          where: {
            tenantId_categoryId_judgeId: {
              tenantId,
              categoryId: category.id,
              judgeId: categoryJudge.judgeId,
            },
          },
        });

        if (!existingCert) {
          await prisma.judgeCertification.create({
            data: {
              tenantId,
              categoryId: category.id,
              judgeId: categoryJudge.judgeId,
              signatureName: categoryJudge.judge.name,
              certifiedAt: new Date(),
            },
          });
        }
      }
    }
  }
}

async function seedRoleAssignments(
  tenantId: string,
  users: { id: string; email: string; role: UserRole }[],
  events: { id: string; name: string; status: string }[]
) {
  console.log('Seeding role assignments...');

  // Find specific users by role
  const tallyMasters = users.filter(u => u.role === UserRole.TALLY_MASTER);
  const auditors = users.filter(u => u.role === UserRole.AUDITOR);
  const organizers = users.filter(u => u.role === UserRole.ORGANIZER);

  // Get an organizer to assign as the assigner
  const assigner = organizers[0] || users.find(u => u.role === UserRole.ADMIN);
  if (!assigner) {
    console.log('  No suitable assigner found, skipping role assignments');
    return;
  }

  for (const event of events) {
    if (event.status === 'upcoming') {
      continue; // Skip upcoming events
    }

    // Assign tally masters to the event
    for (const tallyMaster of tallyMasters) {
      const existingAssignment = await prisma.tallyMasterAssignment.findFirst({
        where: { tenantId, userId: tallyMaster.id, eventId: event.id },
      });

      if (!existingAssignment) {
        await prisma.tallyMasterAssignment.create({
          data: {
            tenantId,
            userId: tallyMaster.id,
            eventId: event.id,
            assignedBy: assigner.id,
            status: 'ACTIVE',
          },
        });
        console.log(`  Assigned ${tallyMaster.email} as Tally Master for ${event.name}`);
      }
    }

    // Assign auditors to the event
    for (const auditor of auditors) {
      const existingAssignment = await prisma.auditorAssignment.findFirst({
        where: { tenantId, userId: auditor.id, eventId: event.id },
      });

      if (!existingAssignment) {
        await prisma.auditorAssignment.create({
          data: {
            tenantId,
            userId: auditor.id,
            eventId: event.id,
            assignedBy: assigner.id,
            status: 'ACTIVE',
          },
        });
        console.log(`  Assigned ${auditor.email} as Auditor for ${event.name}`);
      }
    }
  }
}

// =============================================================================
// Main Execution
// =============================================================================

async function main() {
  console.log('='.repeat(60));
  console.log('Event Manager Database Seed Script');
  console.log('='.repeat(60));
  console.log('');

  try {
    // Step 1: Get or create tenant
    const tenant = await getOrCreateTenant();
    console.log('');

    // Step 2: Create users
    const users = await seedUsers(tenant.id);
    console.log('');

    // Step 3: Create judges
    const judges = await seedJudges(tenant.id);
    console.log('');

    // Step 4: Create contestants
    const contestants = await seedContestants(tenant.id);
    console.log('');

    // Step 5: Create events
    const events = await seedEvents(tenant.id);
    console.log('');

    // Step 6: Create contests and categories
    const categories = await seedContestsAndCategories(
      tenant.id,
      events,
      judges.map(j => ({ id: j.id, name: j.name })),
      contestants.map(c => ({ id: c.id, name: c.name }))
    );
    console.log('');

    // Step 7: Create scores
    await seedScores(tenant.id, categories);
    console.log('');

    // Step 8: Create role assignments
    await seedRoleAssignments(tenant.id, users, events);
    console.log('');

    // Final summary
    console.log('='.repeat(60));
    console.log('Seed Summary');
    console.log('='.repeat(60));

    const counts = {
      users: await prisma.user.count({ where: { tenantId: tenant.id } }),
      judges: await prisma.judge.count({ where: { tenantId: tenant.id } }),
      contestants: await prisma.contestant.count({ where: { tenantId: tenant.id } }),
      events: await prisma.event.count({ where: { tenantId: tenant.id } }),
      contests: await prisma.contest.count({ where: { tenantId: tenant.id } }),
      categories: await prisma.category.count({ where: { tenantId: tenant.id } }),
      criteria: await prisma.criterion.count({ where: { tenantId: tenant.id } }),
      scores: await prisma.score.count({ where: { tenantId: tenant.id } }),
    };

    console.log('');
    Object.entries(counts).forEach(([table, count]) => {
      console.log(`  ${table.padEnd(15)}: ${count}`);
    });

    console.log('');
    console.log('Default login credentials:');
    console.log(`  Email:    superadmin@eventmanager.dev`);
    console.log(`  Password: ${DEFAULT_PASSWORD}`);
    console.log('');
    console.log('Seed completed successfully!');

  } catch (error) {
    console.error('Seed failed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
