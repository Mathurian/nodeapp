import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function invalidateAllSessions() {
  console.log('🔒 Invalidating all user sessions...');

  try {
    const result = await prisma.user.updateMany({
      data: {
        sessionVersion: {
          increment: 1
        }
      }
    });

    console.log(`✅ Invalidated sessions for ${result.count} users`);
    console.log('All users will need to log in again.');
  } catch (error) {
    console.error('❌ Error invalidating sessions:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

invalidateAllSessions()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
