const { chromium } = require('@playwright/test');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://event_manager:dittibop@localhost:5432/event_manager_test?schema=public' } }
});

(async () => {
  try {
    console.log('Creating test tenant and user...');

    // Create tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Test Tenant',
        slug: 'test',
        isActive: true,
        planType: 'enterprise',
        subscriptionStatus: 'active',
      },
    });
    console.log('Created tenant:', tenant.id);

    // Create admin user
    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test Admin',
        role: 'ADMIN',
        tenantId: tenant.id,
        isActive: true,
      },
    });
    console.log('Created user:', user.email);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('\nNavigating to login page...');
    await page.goto('http://localhost:3002/login', { waitUntil: 'networkidle', timeout: 30000 });

    console.log('Filling login form...');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');

    console.log('Clicking submit button...');
    await page.click('button[type="submit"]');

    console.log('Waiting for navigation...');
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10000 });

    console.log('\n✅ Login successful!');
    console.log('Current URL:', page.url());
    console.log('Page title:', await page.title());

    // Check for auth token
    const token = await page.evaluate(() => {
      return localStorage.getItem('token') || sessionStorage.getItem('token');
    });
    console.log('Token found:', !!token);

    await page.screenshot({ path: '/tmp/after-login.png', fullPage: true });
    console.log('Screenshot saved to /tmp/after-login.png');

    await browser.close();

    // Cleanup
    console.log('\nCleaning up test data...');
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.tenant.delete({ where: { id: tenant.id } });
    console.log('✅ Cleanup complete');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
})();
