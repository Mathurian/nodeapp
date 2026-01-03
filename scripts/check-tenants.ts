import 'reflect-metadata';
import prisma from '../src/config/database';

async function checkTenants() {
  try {
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
      },
    });

    console.log('\n=== TENANTS IN DATABASE ===');
    console.log(JSON.stringify(tenants, null, 2));
    console.log(`\nTotal tenants: ${tenants.length}`);

    // Also check users to see their tenant associations
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        tenantId: true,
        role: true,
      },
    });

    console.log('\n=== USERS IN DATABASE ===');
    console.log(JSON.stringify(users, null, 2));
    console.log(`\nTotal users: ${users.length}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTenants();
