#!/usr/bin/env node

/**
 * Manual Login Test Script
 * Tests the complete login flow to diagnose E2E test failures
 */

const fetch = require('node-fetch');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://event_manager:dittibop@localhost:5432/event_manager_test'
    }
  }
});

const BACKEND_URL = 'http://localhost:3001';
const FRONTEND_URL = 'http://localhost:3002';

async function main() {
  console.log('='.repeat(80));
  console.log('MANUAL LOGIN TEST - E2E Test Failure Investigation');
  console.log('='.repeat(80));
  console.log();

  try {
    // Step 1: Create a test tenant
    console.log('Step 1: Creating test tenant...');
    const timestamp = Date.now();
    const tenant = await prisma.tenant.create({
      data: {
        name: `Test Tenant ${timestamp}`,
        slug: `test-tenant-${timestamp}`,
        isActive: true,
        planType: 'enterprise',
        subscriptionStatus: 'active'
      }
    });
    console.log(`✓ Tenant created: ${tenant.slug} (ID: ${tenant.id})`);
    console.log();

    // Step 2: Create a test user
    console.log('Step 2: Creating test user...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = await prisma.user.create({
      data: {
        email: 'debuguser@test.com',
        name: 'Debug User',
        preferredName: 'Debug',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
        sessionVersion: 1,
        tenantId: tenant.id
      }
    });
    console.log(`✓ User created: ${user.email} (ID: ${user.id})`);
    console.log(`  Password: password123`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Tenant: ${tenant.slug}`);
    console.log();

    // Step 3: Get CSRF token from frontend
    console.log('Step 3: Getting CSRF token from frontend...');
    let csrfToken = null;
    try {
      const csrfResponse = await fetch(`${FRONTEND_URL}/api/csrf-token`);
      console.log(`  CSRF Response Status: ${csrfResponse.status}`);
      if (csrfResponse.ok) {
        const csrfData = await csrfResponse.json();
        csrfToken = csrfData.csrfToken || csrfData.token;
        console.log(`✓ CSRF Token obtained: ${csrfToken ? csrfToken.substring(0, 20) + '...' : 'null'}`);
      } else {
        console.log(`✗ Failed to get CSRF token: ${csrfResponse.statusText}`);
        const text = await csrfResponse.text();
        console.log(`  Response: ${text}`);
      }
    } catch (error) {
      console.log(`✗ CSRF request failed: ${error.message}`);
    }
    console.log();

    // Step 4: Attempt login via frontend proxy
    console.log('Step 4: Attempting login via FRONTEND proxy (http://localhost:3002/api/auth/login)...');
    try {
      const loginHeaders = {
        'Content-Type': 'application/json',
        'X-Tenant-Slug': tenant.slug
      };
      if (csrfToken) {
        loginHeaders['X-CSRF-Token'] = csrfToken;
      }

      console.log('  Request headers:', JSON.stringify(loginHeaders, null, 2));
      console.log('  Request body:', JSON.stringify({ email: user.email, password: 'password123' }, null, 2));

      const loginResponse = await fetch(`${FRONTEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: loginHeaders,
        body: JSON.stringify({
          email: user.email,
          password: 'password123'
        })
      });

      console.log(`  Response Status: ${loginResponse.status} ${loginResponse.statusText}`);
      console.log(`  Response Headers:`, Object.fromEntries(loginResponse.headers.entries()));

      const responseText = await loginResponse.text();
      console.log(`  Response Body: ${responseText}`);

      if (loginResponse.ok) {
        const loginData = JSON.parse(responseText);
        console.log('✓ Login successful!');
        console.log('  Token:', loginData.data?.token ? loginData.data.token.substring(0, 30) + '...' : 'null');
        console.log('  User:', loginData.data?.user?.email);
      } else {
        console.log('✗ Login failed!');
        try {
          const errorData = JSON.parse(responseText);
          console.log('  Error:', JSON.stringify(errorData, null, 2));
        } catch (e) {
          console.log('  Raw response:', responseText);
        }
      }
    } catch (error) {
      console.log(`✗ Login request failed: ${error.message}`);
      console.log(`  Stack: ${error.stack}`);
    }
    console.log();

    // Step 5: Attempt login via BACKEND directly
    console.log('Step 5: Attempting login via BACKEND directly (http://localhost:3001/api/auth/login)...');
    try {
      const loginHeaders = {
        'Content-Type': 'application/json',
        'X-Tenant-Slug': tenant.slug
      };
      if (csrfToken) {
        loginHeaders['X-CSRF-Token'] = csrfToken;
      }

      console.log('  Request headers:', JSON.stringify(loginHeaders, null, 2));
      console.log('  Request body:', JSON.stringify({ email: user.email, password: 'password123' }, null, 2));

      const loginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: loginHeaders,
        body: JSON.stringify({
          email: user.email,
          password: 'password123'
        })
      });

      console.log(`  Response Status: ${loginResponse.status} ${loginResponse.statusText}`);
      console.log(`  Response Headers:`, Object.fromEntries(loginResponse.headers.entries()));

      const responseText = await loginResponse.text();
      console.log(`  Response Body: ${responseText}`);

      if (loginResponse.ok) {
        const loginData = JSON.parse(responseText);
        console.log('✓ Login successful!');
        console.log('  Token:', loginData.data?.token ? loginData.data.token.substring(0, 30) + '...' : 'null');
        console.log('  User:', loginData.data?.user?.email);
      } else {
        console.log('✗ Login failed!');
        try {
          const errorData = JSON.parse(responseText);
          console.log('  Error:', JSON.stringify(errorData, null, 2));
        } catch (e) {
          console.log('  Raw response:', responseText);
        }
      }
    } catch (error) {
      console.log(`✗ Login request failed: ${error.message}`);
      console.log(`  Stack: ${error.stack}`);
    }
    console.log();

    // Step 6: Check backend logs
    console.log('Step 6: Checking backend logs for login attempts...');
    console.log('  (Check systemd journal: journalctl -u event-manager -n 50 --no-pager)');
    console.log();

    // Cleanup
    console.log('Cleanup: Deleting test data...');
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.tenant.delete({ where: { id: tenant.id } });
    console.log('✓ Test data cleaned up');
    console.log();

    console.log('='.repeat(80));
    console.log('TEST COMPLETE');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ TEST FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
