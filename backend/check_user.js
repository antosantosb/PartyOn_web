const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const user = await prisma.user.findUnique({
    where: { email: 'admin@partyon.pt' }
  });
  console.log('User found:', user ? { id: user.id, email: user.email, role: user.role } : 'Not found');
  process.exit(0);
}

check();
