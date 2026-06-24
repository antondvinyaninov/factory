const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  const currentUser = await prisma.user.findFirst();
  
  const [tasks, news, totalUsers, departments] = await Promise.all([
      prisma.task.findMany({
        where: {
          OR: [
            { creatorId: currentUser.id },
            { assigneeId: currentUser.id },
          ],
        },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        include: {
          assignee: { select: { id: true, name: true, email: true } },
          creator: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.newsPost.findMany({
        where: { isPublished: true },
        orderBy: { publishedAt: 'desc' },
        take: 5,
        include: {
          author: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.user.count({
        where: {
          isActive: true,
          OR: [
            { personnelNumber: { not: null } },
            { lastName: { not: null } },
            { firstName: { not: null } },
            { department: { not: null } },
            { position: { not: null } },
          ],
        },
      }),
      prisma.user.findMany({
        where: {
          isActive: true,
          OR: [
            { personnelNumber: { not: null } },
            { lastName: { not: null } },
            { firstName: { not: null } },
            { department: { not: null } },
            { position: { not: null } },
          ],
        },
        select: { department: true },
        distinct: ['department'],
      }),
    ]);

    const deptList = departments
      .map((d) => d.department)
      .filter(Boolean)
      .join(', ');

    const str = `Вы — AI-ассистент корпоративного портала Factory 1.0. Ваша роль — помогать сотрудникам, отвечать на вопросы о портале, их задачах, новостях и компании.
Вы общаетесь в вежливом, профессиональном корпоративном тоне на русском языке.
Используйте форматирование markdown (жирный текст, списки, заголовки, ссылки) для повышения читаемости ответов.

Контекст портала для пользователя:
- Текущий пользователь: Имя: "${currentUser.name || 'Не указано'}", Почта: "${currentUser.email}", Роль: "${currentUser.role}".
- Всего активных сотрудников: ${totalUsers}.
- Отделы: ${deptList || 'Отделы отсутствуют'}.
- Актуальные задачи (до 10):
${tasks.map((t, idx) => `${idx + 1}. [${t.status}] "${t.title}" (Исполнитель: ${t.assignee?.name || t.assignee?.email || 'Не назначен'}, Срок: ${t.dueAt ? t.dueAt.toISOString().slice(0, 16).replace('T', ' ') : 'Без срока'})`).join('\n') || 'Задачи отсутствуют.'}

- Последние новости (до 5):
${news.map((n, idx) => `${idx + 1}. "${n.title}" от ${n.author?.name || n.author?.email || 'Система'} (${n.publishedAt ? n.publishedAt.toISOString().slice(0, 10) : 'Без даты'})`).join('\n') || 'Публикации отсутствуют.'}

Ссылки: задачи → /tasks, сообщения → /messages, новости → /news.
Если информация недоступна — сообщи об этом вежливо.`;
  console.log(str);
}
main();
