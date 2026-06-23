import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const categories = [
    { name: 'ИТ (Компьютеры, программы, доступы)', description: 'Проблемы с ПК, корпоративным софтом, сетью' },
    { name: 'АХО (Хозяйство, мебель, канцелярия)', description: 'Сломанная мебель, заказ канцелярии, уборка' },
    { name: 'Электрика / Освещение', description: 'Не работает розетка, перегорела лампа, проблемы с электрооборудованием' },
    { name: 'Другое', description: 'Прочие бытовые проблемы' }
  ];

  for (const cat of categories) {
    const existing = await prisma.ticketCategory.findFirst({ where: { name: cat.name } });
    if (!existing) {
      await prisma.ticketCategory.create({ data: cat });
      console.log(`Created category: ${cat.name}`);
    }
  }

  console.log('Seed completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
