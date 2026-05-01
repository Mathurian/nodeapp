/**
 * Global Mock Setup
 * This file runs BEFORE setup.ts to establish mocks for modules
 * that get loaded during container initialization.
 *
 * Jest's setupFiles runs before setupFilesAfterEnv (setup.ts),
 * allowing us to mock modules before the container imports them.
 */

import * as path from 'path';

const isIntegrationLikeJestRun = process.argv.some((arg) =>
  arg.includes('tests/integration') || arg.includes('tests/contracts'),
);

// Prisma Query Engine Fix: Set the path BEFORE any Prisma imports
// This resolves Jest module resolution issues with native .node modules
const projectRoot = path.resolve(__dirname, '..');
process.env.PRISMA_QUERY_ENGINE_LIBRARY = path.join(
  projectRoot,
  'node_modules/.prisma/client/libquery_engine-debian-openssl-3.0.x.so.node'
);

if (isIntegrationLikeJestRun) {
  jest.unmock('bcrypt');
} else {
  // Mock bcrypt globally
  jest.mock('bcrypt', () => ({
    compare: jest.fn().mockResolvedValue(true),
    hash: jest.fn().mockResolvedValue('hashed-password'),
    genSalt: jest.fn().mockResolvedValue('salt'),
  }));
}

if (isIntegrationLikeJestRun) {
  jest.unmock('jsonwebtoken');
} else {
  // Mock jsonwebtoken globally
  jest.mock('jsonwebtoken', () => ({
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
    verify: jest.fn().mockReturnValue({
      userId: 'mock-user-id',
      email: 'test@example.com',
      role: 'ADMIN',
      sessionVersion: 1,
      tenantId: 'mock-tenant-id',
    }),
    decode: jest.fn().mockReturnValue({
      userId: 'mock-user-id',
      email: 'test@example.com',
    }),
  }));
}

// NOTE: crypto is NOT mocked globally because it breaks LocalSecretStore and other
// services that need real crypto operations (createCipheriv, etc.).
// Individual tests that need crypto.randomBytes mocked should mock it locally.

// Mock speakeasy (for MFA)
jest.mock('speakeasy', () => ({
  generateSecret: jest.fn().mockReturnValue({
    base32: 'MOCK_SECRET_BASE32',
    otpauth_url: 'otpauth://totp/Test:user@example.com?secret=MOCK_SECRET_BASE32',
  }),
  totp: {
    verify: jest.fn().mockReturnValue(true),
  },
}));

// Mock qrcode (for MFA QR generation)
jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mockQRCode'),
}));

// Mock ioredis globally because the DI container imports cache-backed services
// during test setup, before individual test files can install local mocks.
jest.mock('ioredis', () => {
  const RedisMock = jest.fn().mockImplementation(() => ({
    on: jest.fn().mockReturnThis(),
    connect: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(0),
    exists: jest.fn().mockResolvedValue(0),
    mget: jest.fn().mockResolvedValue([]),
    keys: jest.fn().mockResolvedValue([]),
    flushdb: jest.fn().mockResolvedValue('OK'),
    info: jest.fn().mockResolvedValue(''),
    dbsize: jest.fn().mockResolvedValue(0),
    ping: jest.fn().mockResolvedValue('PONG'),
    pipeline: jest.fn().mockReturnValue({
      setex: jest.fn().mockReturnThis(),
      sadd: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      del: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    }),
    incrby: jest.fn().mockResolvedValue(0),
    decrby: jest.fn().mockResolvedValue(0),
    expire: jest.fn().mockResolvedValue(1),
    ttl: jest.fn().mockResolvedValue(-1),
    sadd: jest.fn().mockResolvedValue(1),
    smembers: jest.fn().mockResolvedValue([]),
    publish: jest.fn().mockResolvedValue(0),
    subscribe: jest.fn().mockResolvedValue(1),
    quit: jest.fn().mockResolvedValue('OK'),
    type: jest.fn().mockResolvedValue('string'),
    call: jest.fn().mockResolvedValue(0),
  }));

  return Object.assign(RedisMock, {
    __esModule: true,
    default: RedisMock,
    Redis: RedisMock,
  });
});

// Mock puppeteer (for PDF generation in PrintService)
jest.mock('puppeteer', () => ({
  launch: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      setContent: jest.fn().mockResolvedValue(undefined),
      pdf: jest.fn().mockResolvedValue(Buffer.from('mock pdf')),
    }),
    close: jest.fn().mockResolvedValue(undefined),
  }),
}));

// Mock fs with all methods as jest.fn() so tests can customize behavior
// This provides a baseline mock that individual tests can override via mockImplementation/mockReturnValue
jest.mock('fs', () => {
  const actualFs = jest.requireActual('fs');
  return {
    ...actualFs,
    // Sync methods (wrapped in jest.fn for customization)
    existsSync: jest.fn().mockImplementation(actualFs.existsSync),
    mkdirSync: jest.fn().mockImplementation(actualFs.mkdirSync),
    statSync: jest.fn().mockImplementation(actualFs.statSync),
    unlinkSync: jest.fn().mockImplementation(actualFs.unlinkSync),
    readdirSync: jest.fn().mockImplementation(actualFs.readdirSync),
    readFileSync: jest.fn().mockImplementation(actualFs.readFileSync),
    writeFileSync: jest.fn().mockImplementation(actualFs.writeFileSync),
    // Promises API (mocked with default test behavior)
    promises: {
      ...actualFs.promises,
      mkdir: jest.fn().mockResolvedValue(undefined),
      readdir: jest.fn().mockResolvedValue([]),
      writeFile: jest.fn().mockResolvedValue(undefined),
      readFile: jest.fn().mockRejectedValue(new Error('File not found')),
      unlink: jest.fn().mockResolvedValue(undefined),
      access: jest.fn().mockResolvedValue(undefined),
    },
  };
});

// Export mock references for tests to customize behavior
export const globalMocks = {
  bcrypt: isIntegrationLikeJestRun ? jest.requireActual('bcrypt') : jest.requireMock('bcrypt'),
  jwt: isIntegrationLikeJestRun
    ? jest.requireActual('jsonwebtoken')
    : jest.requireMock('jsonwebtoken'),
  speakeasy: jest.requireMock('speakeasy'),
  qrcode: jest.requireMock('qrcode'),
  ioredis: jest.requireMock('ioredis'),
  puppeteer: jest.requireMock('puppeteer'),
  fs: jest.requireMock('fs'),
};
