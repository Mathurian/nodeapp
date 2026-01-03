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
    
    // Check if admin already exists
    const existing = await prisma.user.findFirst({
      where: { email: 'admin@example.com', tenantId: tenant.id }
    });
    
    if (existing) {
      console.log('✅ Admin user already exists: admin@example.com');
      console.log('   Password: admin123');
      console.log('   Role:', existing.role);
      console.log('   Tenant: default');
      process.exit(0);
    }
    
    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const admin = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        name: 'System Administrator',
        password: hashedPassword,
        role: 'ADMIN',
        tenantId: tenant.id,
        isActive: true
      }
    });
    
    console.log('✅ Admin user created successfully!');
    console.log('   Email: admin@example.com');
    console.log('   Password: admin123');
    console.log('   Role:', admin.role);
    console.log('   Tenant: default');
    console.log('');
    console.log('🌐 Login at: http://localhost:3002/login');
    console.log('   or with tenant: http://localhost:3002/default/login');
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
