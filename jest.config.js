module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/e2e/', // Exclude E2E tests (Playwright) from Jest
    '.e2e.test.ts$', // Exclude files ending with .e2e.test.ts
  ],

  // Coverage collection configuration
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/types/**/*.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.type.ts',
    '!src/config/**',
    '!src/server.ts', // Main entry point - tested via integration
    '!src/database/migrate.ts', // Migration script
    '!src/database/seed.ts', // Seed script
  ],

  // Enhanced coverage thresholds for critical paths (80%+)
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    // Critical paths require higher coverage
    './src/services/**/*.ts': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/middleware/**/*.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/controllers/**/*.ts': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    },
    './src/repositories/**/*.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Coverage reporters
  coverageReporters: [
    'text',           // Terminal output
    'text-summary',   // Summary in terminal
    'html',          // HTML report
    'lcov',          // For CI integration
    'json',          // JSON format
    'json-summary'   // Summary in JSON
  ],

  // Path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@controllers/(.*)$': '<rootDir>/src/controllers/$1',
    '^@middleware/(.*)$': '<rootDir>/src/middleware/$1',
    '^@repositories/(.*)$': '<rootDir>/src/repositories/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    // Prisma Query Engine Fix: Ensure Jest resolves Prisma from the correct location
    '^@prisma/client$': '<rootDir>/node_modules/@prisma/client',
    '^.prisma/client$': '<rootDir>/node_modules/.prisma/client',
  },

  moduleDirectories: ['node_modules', '<rootDir>'],

  // Global mocks - runs BEFORE setupFilesAfterEnv to mock modules before container loads
  setupFiles: ['<rootDir>/tests/jest.globalMocks.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

  // Increased timeout for integration tests
  testTimeout: 30000,

  // Keep full-suite output compact by default. Use JEST_VERBOSE=true when
  // debugging individual files and full per-test reporting is needed.
  verbose: process.env.JEST_VERBOSE === 'true',

  // Coverage directory
  coverageDirectory: 'coverage',

  // Only collect coverage when explicitly requested
  collectCoverage: false,

  // Normal test runs must drain handles naturally. Use JEST_FORCE_EXIT=true
  // only as a temporary local debugging escape hatch for a known leak.
  forceExit: process.env.JEST_FORCE_EXIT === 'true',

  // Open-handle detection is expensive and retains extra state across this
  // large suite. Use JEST_DETECT_OPEN_HANDLES=true for focused leak debugging.
  detectOpenHandles: process.env.JEST_DETECT_OPEN_HANDLES === 'true',

  // Max workers for parallel test execution
  // Limited to prevent database connection pool exhaustion
  maxWorkers: 2,

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Transform configuration
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        resolveJsonModule: true,
        skipLibCheck: true
      }
    }]
    // Removed babel-jest transform to fix TypeError conflicts with ts-jest
  },

  // Prisma Query Engine Fix:
  // - Exclude .prisma/client from transforms to prevent Jest from interfering with native module loading
  // - Exclude @prisma packages from transforms as they contain pre-built code
  transformIgnorePatterns: [
    '/node_modules/(?!(@prisma|.prisma))',
    '/node_modules/.prisma/client/',
  ],

  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  extensionsToTreatAsEsm: [],

  // Test result processors
  testResultsProcessor: undefined,

  // Global setup/teardown
  globalSetup: undefined,
  globalTeardown: undefined
};
