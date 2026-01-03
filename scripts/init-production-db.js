const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function initializeDatabase() {
  try {
    console.log('🔄 Initializing production database...');

    // Check if default tenant exists
    let tenant = await prisma.tenant.findUnique({
      where: { slug: 'default' }
    });

    if (!tenant) {
      console.log('📝 Creating default tenant...');
      tenant = await prisma.tenant.create({
        data: {
          name: 'Default Organization',
          slug: 'default',
          domain: 'conmgr.com',
          isActive: true,
          planType: 'enterprise',
          subscriptionStatus: 'active'
        }
      });
      console.log('✅ Default tenant created:', tenant.slug);
    } else {
      console.log('✅ Default tenant already exists:', tenant.slug);
    }

    // Check if admin user exists
    const adminUser = await prisma.user.findFirst({
      where: {
        tenantId: tenant.id,
        role: 'SUPER_ADMIN'
      }
    });

    if (!adminUser) {
      console.log('📝 Creating default admin user...');
      const hashedPassword = await bcrypt.hash('admin123', 10);

      const newAdmin = await prisma.user.create({
        data: {
          email: 'admin@conmgr.com',
          name: 'System Administrator',
          preferredName: 'Admin',
          password: hashedPassword,
          role: 'SUPER_ADMIN',
          isActive: true,
          sessionVersion: 1,
          tenantId: tenant.id
        }
      });

      console.log('✅ Admin user created:');
      console.log('   Email: admin@conmgr.com');
      console.log('   Password: admin123');
      console.log('   Role: SUPER_ADMIN');
    } else {
      console.log('✅ Admin user already exists:', adminUser.email);
    }

    console.log('\n🎉 Database initialization complete!');
    console.log('\nYou can now log in with:');
    console.log('  Email: admin@conmgr.com');
    console.log('  Password: admin123');

  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

initializeDatabase();
