import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';
import { AuthService } from '../../src/services/AuthService';
import { getTestPrismaClient } from '../setup';

describe('Test database schema alignment', () => {
  const prisma: PrismaClient = getTestPrismaClient();
  const tenantSlug = 'schema-alignment-test';
  const userEmail = 'board-role-schema@test.local';
  let tenantId: string;

  beforeAll(async () => {
    const tenant = await prisma.tenant.upsert({
      where: { slug: tenantSlug },
      update: {
        name: 'Schema Alignment Test',
        isActive: true,
      },
      create: {
        name: 'Schema Alignment Test',
        slug: tenantSlug,
        isActive: true,
        planType: 'enterprise',
        subscriptionStatus: 'active',
      },
    });

    tenantId = tenant.id;

    await prisma.user.deleteMany({
      where: {
        tenantId,
        email: userEmail,
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        tenantId,
        email: userEmail,
      },
    });
  });

  it('includes Prisma fields required by integration and contract test setup', async () => {
    const columns = await prisma.$queryRaw<Array<{ table_name: string; column_name: string }>>`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND (
          table_name = 'users' AND column_name = 'boardRole'
          OR table_name = 'events' AND column_name IN (
            'requireAllTallyCertifiers',
            'requireAllAuditorCertifiers'
          )
        )
      ORDER BY table_name, column_name
    `;

    const columnNames = columns.map((column) => `${column.table_name}.${column.column_name}`);

    expect(columnNames).toEqual(
      expect.arrayContaining([
        'events.requireAllAuditorCertifiers',
        'events.requireAllTallyCertifiers',
        'users.boardRole',
      ])
    );
  });

  it('creates a board user and lets AuthService read boardRole during login', async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);

    await prisma.user.create({
      data: {
        email: userEmail,
        name: 'Board Role Schema User',
        password: hashedPassword,
        role: UserRole.BOARD,
        boardRole: 'Chair',
        isActive: true,
        sessionVersion: 1,
        tenantId,
      },
    });

    const authService = new AuthService(
      prisma,
      {} as ConstructorParameters<typeof AuthService>[1],
      {} as ConstructorParameters<typeof AuthService>[2],
      {} as ConstructorParameters<typeof AuthService>[3]
    );

    const result = await authService.login(
      {
        email: userEmail,
        password: 'password123',
      },
      tenantId
    );

    expect(result.user.email).toBe(userEmail);
    expect(result.user.role).toBe(UserRole.BOARD);
    expect(result.user.boardRole).toBe('Chair');
  });
});
