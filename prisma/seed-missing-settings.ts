import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const missingSettings = [
  // Security Settings
  { key: 'security_maxLoginAttempts', value: '5', category: 'security', description: 'Maximum number of failed login attempts before account lockout' },
  { key: 'security_lockoutDuration', value: '15', category: 'security', description: 'Account lockout duration in minutes after max login attempts' },
  { key: 'security_sessionTimeout', value: '24', category: 'security', description: 'Session timeout in hours' },
  { key: 'security_requireStrongPasswords', value: 'true', category: 'security', description: 'Require strong passwords (uppercase, lowercase, numbers, special chars)' },
  { key: 'security_requireEmailVerification', value: 'false', category: 'security', description: 'Require email verification for new accounts' },
  { key: 'security_require2FA', value: 'false', category: 'security', description: 'Require two-factor authentication for all users' },

  // Password Policy
  { key: 'password_minLength', value: '8', category: 'password_policy', description: 'Minimum password length' },
  { key: 'password_requireUppercase', value: 'true', category: 'password_policy', description: 'Require at least one uppercase letter' },
  { key: 'password_requireLowercase', value: 'true', category: 'password_policy', description: 'Require at least one lowercase letter' },
  { key: 'password_requireNumbers', value: 'true', category: 'password_policy', description: 'Require at least one number' },
  { key: 'password_requireSpecialChars', value: 'true', category: 'password_policy', description: 'Require at least one special character' },

  // Contestant Visibility (if not already present)
  { key: 'contestant_visibility_canViewWinners', value: 'true', category: 'contestant_visibility', description: 'Allow contestants to view winners' },
  { key: 'contestant_visibility_canViewScores', value: 'false', category: 'contestant_visibility', description: 'Allow contestants to view their scores' },
  { key: 'contestant_visibility_canViewRankings', value: 'false', category: 'contestant_visibility', description: 'Allow contestants to view rankings' },
  { key: 'contestant_visibility_canViewComments', value: 'false', category: 'contestant_visibility', description: 'Allow contestants to view judge comments' },
];

async function seedMissingSettings() {
  console.log('Starting to seed missing settings...');

  let added = 0;
  let skipped = 0;

  for (const setting of missingSettings) {
    try {
      const existing = await prisma.systemSetting.findUnique({
        where: { key: setting.key }
      });

      if (existing) {
        console.log(`✓ Setting already exists: ${setting.key}`);
        skipped++;
      } else {
        await prisma.systemSetting.create({
          data: setting
        });
        console.log(`+ Added setting: ${setting.key}`);
        added++;
      }
    } catch (error) {
      console.error(`✗ Failed to add setting ${setting.key}:`, error);
    }
  }

  console.log(`\nSummary:`);
  console.log(`- Added: ${added}`);
  console.log(`- Already exists: ${skipped}`);
  console.log(`- Total attempted: ${missingSettings.length}`);
}

seedMissingSettings()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
