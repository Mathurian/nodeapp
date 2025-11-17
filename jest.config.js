module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],

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
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },

  moduleDirectories: ['node_modules', '<rootDir>'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

  // Increased timeout for integration tests
  testTimeout: 30000,

  // Verbose output
  verbose: true,

  // Coverage directory
  coverageDirectory: 'coverage',

  // Only collect coverage when explicitly requested
  collectCoverage: false,

  // Force Jest to exit after tests complete (handles hanging connections)
  forceExit: true,

  // Detect open handles (useful for debugging)
  detectOpenHandles: true,

  // Max workers for parallel test execution
  maxWorkers: '50%',

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Transform configuration
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      isolatedModules: true,
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

  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))'
  ],

  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  extensionsToTreatAsEsm: [],

  // Test result processors
  testResultsProcessor: undefined,

  // Global setup/teardown
  globalSetup: undefined,
  globalTeardown: undefined
};
