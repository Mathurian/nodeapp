/**
 * API Contract Tests Index
 *
 * This module provides API contract testing infrastructure for the Event Manager backend.
 * Contract tests validate that API responses match expected TypeScript types/schemas,
 * helping prevent breaking changes to the API contract.
 *
 * ## Purpose
 * - Ensure API responses match expected schemas
 * - Detect breaking changes early in development
 * - Document expected API response structures
 * - Validate both success and error response formats
 *
 * ## Usage
 * Run contract tests with: npm run test:contracts
 *
 * ## Directory Structure
 * - schemas/ - Zod schema definitions for API responses
 *   - userSchemas.ts - User API response schemas
 *   - eventSchemas.ts - Event API response schemas
 *   - scoreSchemas.ts - Scoring API response schemas
 *   - certificationSchemas.ts - Certification API response schemas
 * - *.contract.test.ts - Contract test files for each API domain
 *
 * ## Adding New Contract Tests
 * 1. Define Zod schemas in schemas/ directory
 * 2. Create a new *.contract.test.ts file
 * 3. Use expectResponseToMatchSchema() to validate responses
 * 4. Test both success and error response structures
 */

// Re-export schemas for external use
export * from './schemas';
