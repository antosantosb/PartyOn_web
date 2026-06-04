const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const readline = require('readline');
const path = require('path');

// Load environment variables from backend root directory
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();

const askQuestion = (query) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve) => rl.question(query, (ans) => {
    rl.close();
    resolve(ans);
  }));
};

async function main() {
  let email = process.argv[2];
  let password = process.argv[3];
  let role = process.argv[4];

  if (!email || !password || !role) {
    console.log('\n--- Creación de Usuario PartyOn (Interactivo) ---');
    if (!email) {
      email = await askQuestion('Introduce el email del usuario: ');
    }
    if (!password) {
      password = await askQuestion('Introduce la contraseña: ');
    }
    if (!role) {
      const roleSelection = await askQuestion('Introduce el rol (DEV, ADMIN, STAFF): ');
      role = roleSelection.toUpperCase().trim();
    }
  }

  email = email.trim();
  password = password.trim();
  role = role.toUpperCase().trim();

  if (!['DEV', 'ADMIN', 'STAFF'].includes(role)) {
    console.error('\n❌ Error: El rol debe ser DEV, ADMIN o STAFF');
    process.exit(1);
  }

  if (!email || !password) {
    console.error('\n❌ Error: Email y contraseña no pueden estar vacíos');
    process.exit(1);
  }

  console.log(`\nCreando usuario ${email} con rol ${role}...`);

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        password: hashedPassword,
        role
      },
      create: {
        email,
        password: hashedPassword,
        role
      }
    });

    console.log(`\n✅ Usuario creado/actualizado con éxito: ${user.email} (Rol: ${user.role})\n`);
  } catch (error) {
    console.error('\n❌ Error al guardar en la base de datos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
