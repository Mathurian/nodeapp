const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://event_manager:dittibop@localhost:5432/event_manager?schema=public'
    }
  }
});

async function main() {
  try {
    // Get default tenant
    const tenant = await prisma.tenant.findUnique({
      where: { slug: 'default' }
    });

    if (!tenant) {
      console.error('Default tenant not found');
      process.exit(1);
    }

    console.log('Found tenant:', tenant.slug);

    const email = 'admin@eeventmanager.com';
    const password = 'password123';

    // Check if admin already exists
    const existing = await prisma.user.findFirst({
      where: { email, tenantId: tenant.id }
    });

    if (existing) {
      // Update password
      const hashedPassword = await bcrypt.hash(password, 12);
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          password: hashedPassword,
          isActive: true
        }
      });
      console.log('✅ Admin user password updated!');
      console.log('   Email:', email);
      console.log('   Password:', password);
      console.log('   Role:', existing.role);
      console.log('   Tenant: default');
    } else {
      // Create admin user
      const hashedPassword = await bcrypt.hash(password, 12);

      const admin = await prisma.user.create({
        data: {
          email,
          name: 'Event Manager Administrator',
          password: hashedPassword,
          role: 'SUPER_ADMIN',
          tenantId: tenant.id,
          isActive: true
        }
      });

      console.log('✅ Admin user created successfully!');
      console.log('   Email:', email);
      console.log('   Password:', password);
      console.log('   Role:', admin.role);
      console.log('   Tenant: default');
    }

    console.log('');
    console.log('🌐 Login at: http://conmgr.com/login');
    console.log('   or with tenant: http://conmgr.com/default/login');

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
