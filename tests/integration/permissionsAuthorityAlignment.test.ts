import request from 'supertest';
import { UserRole } from '@prisma/client';
import app from '../../src/server';
import {
  cleanupTestData,
  createTestUser,
  disconnectPrisma,
  generateAuthToken,
  prisma,
  uniqueTestId,
} from '../helpers/testUtils';

describe('Permissions authority alignment integration tests', () => {
  const prefix = 'task94-authz-';
  let tenantId: string;
  let adminUser: Awaited<ReturnType<typeof createTestUser>>;
  let organizerUser: Awaited<ReturnType<typeof createTestUser>>;
  let adminToken: string;
  let organizerToken: string;
  let winnerPublishContestId: string;

  const setRolePermission = async (resource: string, operation: string, allowed: boolean) => {
    const response = await request(app)
      .put('/api/permissions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        role: 'ORGANIZER',
        resource,
        operation,
        allowed,
        reason: 'TASK-94.2 integration verification',
      });

    expect(response.status).toBe(200);
  };

  beforeAll(async () => {
    await cleanupTestData(prefix);

    adminUser = await createTestUser({
      role: UserRole.ADMIN,
      email: `${prefix}admin-${uniqueTestId()}@example.com`,
      name: `${prefix}admin`,
    });
    organizerUser = await createTestUser({
      role: UserRole.ORGANIZER,
      email: `${prefix}organizer-${uniqueTestId()}@example.com`,
      name: `${prefix}organizer`,
    });

    tenantId = adminUser.tenantId;
    adminToken = generateAuthToken(adminUser.id, UserRole.ADMIN);
    organizerToken = generateAuthToken(organizerUser.id, UserRole.ORGANIZER);

    const event = await prisma.event.create({
      data: {
        name: `${prefix}event-${uniqueTestId()}`,
        description: 'TASK-94.2 verification event',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        location: 'Integration test venue',
        tenantId,
      },
    });
    const contest = await prisma.contest.create({
      data: {
        name: `${prefix}contest-${uniqueTestId()}`,
        description: 'TASK-94.2 verification contest',
        eventId: event.id,
        tenantId,
      },
    });
    winnerPublishContestId = contest.id;
  });

  afterEach(async () => {
    await prisma.rolePermission.deleteMany({
      where: {
        tenantId,
        role: UserRole.ORGANIZER,
        resource: {
          in: ['events', 'users', 'assignments', 'results'],
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.rolePermission.deleteMany({
      where: {
        tenantId,
        role: UserRole.ORGANIZER,
        resource: {
          in: ['events', 'users', 'assignments', 'results'],
        },
      },
    });
    await cleanupTestData(prefix);
    await disconnectPrisma();
  });

  it('enforces events:read on the direct events API', async () => {
    const allowedResponse = await request(app)
      .get('/api/events')
      .set('Authorization', `Bearer ${organizerToken}`);

    expect(allowedResponse.status).toBe(200);

    await setRolePermission('events', '*', false);

    const deniedResponse = await request(app)
      .get('/api/events')
      .set('Authorization', `Bearer ${organizerToken}`);

    expect(deniedResponse.status).toBe(403);
  });

  it('enforces users:write on direct user creation', async () => {
    const allowedEmail = `${prefix}created-allowed-${uniqueTestId()}@example.com`;
    const deniedEmail = `${prefix}created-denied-${uniqueTestId()}@example.com`;
    const createUserPayload = (email: string) => ({
      email,
      name: `${prefix}created-user`,
      preferredName: `${prefix}created-user`,
      password: 'SecurePass123!',
      role: 'CONTESTANT',
    });

    const allowedResponse = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send(createUserPayload(allowedEmail));

    expect([200, 201]).toContain(allowedResponse.status);

    await setRolePermission('users', '*', false);

    const deniedResponse = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send(createUserPayload(deniedEmail));

    expect(deniedResponse.status).toBe(403);
  });

  it('enforces assignments:read on the direct assignments API', async () => {
    const allowedResponse = await request(app)
      .get('/api/assignments')
      .set('Authorization', `Bearer ${organizerToken}`);

    expect(allowedResponse.status).toBe(200);

    await setRolePermission('assignments', '*', false);

    const deniedResponse = await request(app)
      .get('/api/assignments')
      .set('Authorization', `Bearer ${organizerToken}`);

    expect(deniedResponse.status).toBe(403);
  });

  it('enforces results:write on the winners publish API', async () => {
    const allowedResponse = await request(app)
      .post(`/api/winners/contest/${winnerPublishContestId}/publish`)
      .set('Authorization', `Bearer ${organizerToken}`);

    expect(allowedResponse.status).not.toBe(403);

    await setRolePermission('results', '*', false);

    const deniedResponse = await request(app)
      .post(`/api/winners/contest/${winnerPublishContestId}/publish`)
      .set('Authorization', `Bearer ${organizerToken}`);

    expect(deniedResponse.status).toBe(403);
  });
});
