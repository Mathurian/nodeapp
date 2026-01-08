/**
 * Permission System Test Script
 * Tests both hardcoded (fallback) and dynamic (database) permission modes
 */

// Load environment variables first
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import 'reflect-metadata';
import { hasPermission, hasPermissionAsync, ENABLE_DYNAMIC_PERMISSIONS } from '../src/middleware/permissions';

console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                      Permission System Test                               ║
╚════════════════════════════════════════════════════════════════════════════╝
`);

console.log(`\n📊 Configuration:`);
console.log(`   - ENABLE_DYNAMIC_PERMISSIONS: ${ENABLE_DYNAMIC_PERMISSIONS ? 'ENABLED' : 'DISABLED'}`);
console.log(`   - Mode: ${ENABLE_DYNAMIC_PERMISSIONS ? 'Dynamic (database)' : 'Hardcoded (fallback)'}\n`);

// Test cases
const testCases = [
  { role: 'SUPER_ADMIN', action: 'events:create', expected: true },
  { role: 'SUPER_ADMIN', action: 'anything:anything', expected: true },
  { role: 'ADMIN', action: 'users:delete', expected: true },
  { role: 'ORGANIZER', action: 'events:create', expected: true },
  { role: 'ORGANIZER', action: 'events:read', expected: true },
  { role: 'JUDGE', action: 'scores:write', expected: true },
  { role: 'JUDGE', action: 'scores:read', expected: true },
  { role: 'JUDGE', action: 'users:delete', expected: false },
  { role: 'CONTESTANT', action: 'events:read', expected: true },
  { role: 'CONTESTANT', action: 'profile:write', expected: true },
  { role: 'CONTESTANT', action: 'users:create', expected: false },
  { role: 'EMCEE', action: 'announcements:write', expected: true },
  { role: 'EMCEE', action: 'scores:write', expected: false },
  { role: 'TALLY_MASTER', action: 'scores:write', expected: true },
  { role: 'TALLY_MASTER', action: 'results:read', expected: true },
  { role: 'AUDITOR', action: 'audit-logs:read', expected: true },
  { role: 'AUDITOR', action: 'approvals:write', expected: true },
];

console.log(`\n🧪 Testing Hardcoded Permissions (Sync):\n`);

let passedSync = 0;
let failedSync = 0;

for (const test of testCases) {
  const result = hasPermission(test.role, test.action);
  const passed = result === test.expected;

  if (passed) {
    console.log(`   ✅ ${test.role} → ${test.action}: ${result} (expected: ${test.expected})`);
    passedSync++;
  } else {
    console.log(`   ❌ ${test.role} → ${test.action}: ${result} (expected: ${test.expected})`);
    failedSync++;
  }
}

console.log(`\n📊 Hardcoded Test Results:`);
console.log(`   ✅ Passed: ${passedSync}/${testCases.length}`);
console.log(`   ❌ Failed: ${failedSync}/${testCases.length}`);
console.log(`   Success Rate: ${((passedSync / testCases.length) * 100).toFixed(1)}%`);

// Test async version (will use dynamic if enabled, fallback to hardcoded if disabled)
async function testAsync() {
  console.log(`\n\n🧪 Testing Async Permissions (Dynamic if enabled, Hardcoded if disabled):\n`);

  let passedAsync = 0;
  let failedAsync = 0;

  // Use a sample tenantId from the database
  const tenantId = 'cmiypkra2000013dv0j9qm9s8';

  for (const test of testCases) {
    try {
      const result = await hasPermissionAsync(test.role, test.action, tenantId);
      const passed = result === test.expected;

      if (passed) {
        console.log(`   ✅ ${test.role} → ${test.action}: ${result} (expected: ${test.expected})`);
        passedAsync++;
      } else {
        console.log(`   ❌ ${test.role} → ${test.action}: ${result} (expected: ${test.expected})`);
        failedAsync++;
      }
    } catch (error) {
      console.log(`   ❌ ${test.role} → ${test.action}: ERROR - ${(error as Error).message}`);
      failedAsync++;
    }
  }

  console.log(`\n📊 Async Test Results:`);
  console.log(`   ✅ Passed: ${passedAsync}/${testCases.length}`);
  console.log(`   ❌ Failed: ${failedAsync}/${testCases.length}`);
  console.log(`   Success Rate: ${((passedAsync / testCases.length) * 100).toFixed(1)}%`);

  // Overall summary
  console.log(`\n\n╔════════════════════════════════════════════════════════════════════════════╗`);
  console.log(`║                          Test Summary                                     ║`);
  console.log(`╚════════════════════════════════════════════════════════════════════════════╝`);
  console.log(``);
  console.log(`   Hardcoded (Sync): ${passedSync}/${testCases.length} passed`);
  console.log(`   Async (${ENABLE_DYNAMIC_PERMISSIONS ? 'Dynamic' : 'Hardcoded'}): ${passedAsync}/${testCases.length} passed`);
  console.log(``);

  if (passedSync === testCases.length && passedAsync === testCases.length) {
    console.log(`   ✅ ALL TESTS PASSED`);
    console.log(`   ✅ Permission system is working correctly`);
  } else {
    console.log(`   ❌ SOME TESTS FAILED`);
    console.log(`   ⚠️  Permission system may have issues`);
  }
  console.log(``);

  if (!ENABLE_DYNAMIC_PERMISSIONS) {
    console.log(`💡 Dynamic permissions are currently DISABLED.`);
    console.log(`   The system is using hardcoded permissions as fallback.`);
    console.log(`   To test dynamic permissions:`);
    console.log(`   1. Add to .env: ENABLE_DYNAMIC_PERMISSIONS=true`);
    console.log(`   2. Re-run this test: npx tsx scripts/test-permissions.ts`);
    console.log(``);
  } else {
    console.log(`✅ Dynamic permissions are ENABLED and working correctly.`);
    console.log(``);
  }
}

testAsync().catch(error => {
  console.error(`\n❌ Async test failed: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});
