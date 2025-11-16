/**
 * Test Credentials Helper
 * Standardizes test credentials across all test suites
 * 
 * IMPORTANT: All tests should use 'password123' as the test password
 * to match the application's seed data.
 */

import bcrypt from 'bcryptjs';

// Standard test password - MUST match seed data password
export const TEST_PASSWORD = 'password123';

// Standard test user credentials (matching seed data)
export const TEST_CREDENTIALS = {
  admin: {
    email: 'admin@eventmanager.com',
    password: TEST_PASSWORD
  },
  organizer: {
    email: 'organizer@eventmanager.com',
    password: TEST_PASSWORD
  },
  judge: {
    email: 'judge@eventmanager.com',
    password: TEST_PASSWORD
  },
  contestant: {
    email: 'contestant@eventmanager.com',
    password: TEST_PASSWORD
  },
  board: {
    email: 'board@eventmanager.com',
    password: TEST_PASSWORD
  },
  tallyMaster: {
    email: 'tallymaster@eventmanager.com',
    password: TEST_PASSWORD
  },
  auditor: {
    email: 'auditor@eventmanager.com',
    password: TEST_PASSWORD
  },
  emcee: {
    email: 'emcee@eventmanager.com',
    password: TEST_PASSWORD
  }
};

/**
 * Hash the standard test password for creating users
 */
export async function hashTestPassword(): Promise<string> {
  return bcrypt.hash(TEST_PASSWORD, 10);
}

/**
 * Create a test user with the standard test password
 */
export async function createTestUserWithStandardPassword(prisma: any, userData: any) {
  const hashedPassword = await hashTestPassword();
  
  return prisma.user.create({
    data: {
      ...userData,
      password: hashedPassword
    }
  });
}

/**
 * Login with test credentials and return the auth token
 */
export async function loginWithTestCredentials(request: any, role: keyof typeof TEST_CREDENTIALS = 'admin') {
  const credentials = TEST_CREDENTIALS[role];
  const response = await request
    .post('/api/auth/login')
    .send({
      email: credentials.email,
      password: credentials.password
    });
  
  if (response.status === 200 || response.status === 201) {
    const body = response.body;
    return body.data?.token || body.token || null;
  }
  
  return null;
}

/**
 * Login with custom credentials and return the auth token
 */
export async function loginWithCredentials(request: any, email: string, password: string) {
  const response = await request
    .post('/api/auth/login')
    .send({
      email,
      password
    });
  
  if (response.status === 200 || response.status === 201) {
    const body = response.body;
    return body.data?.token || body.token || null;
  }
  
  return null;
}


