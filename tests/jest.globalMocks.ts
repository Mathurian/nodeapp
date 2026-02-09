/**
 * Global Mock Setup
 * This file runs BEFORE setup.ts to establish mocks for modules
 * that get loaded during container initialization.
 *
 * Jest's setupFiles runs before setupFilesAfterEnv (setup.ts),
 * allowing us to mock modules before the container imports them.
 */

// Mock bcrypt globally
jest.mock('bcrypt', () => ({
  compare: jest.fn().mockResolvedValue(true),
  hash: jest.fn().mockResolvedValue('hashed-password'),
  genSalt: jest.fn().mockResolvedValue('salt'),
}));

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
  bcrypt: jest.requireMock('bcrypt'),
  jwt: jest.requireMock('jsonwebtoken'),
  speakeasy: jest.requireMock('speakeasy'),
  qrcode: jest.requireMock('qrcode'),
  puppeteer: jest.requireMock('puppeteer'),
  fs: jest.requireMock('fs'),
};
