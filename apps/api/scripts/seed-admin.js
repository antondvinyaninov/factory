const { PrismaClient, UserRole } = require('@prisma/client');
const { hash } = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@admin.ru';
  const passwordHash = await hash('admin', 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      name: 'Супер администратор',
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
    create: {
      email,
      passwordHash,
      name: 'Супер администратор',
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
  });

  console.log(JSON.stringify({ id: user.id, email: user.email, role: user.role }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
