const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const adminId = 'cmqfl4m0g000081rw9382ut78';
  const annaId = 'cmqjz01y50000qonbopijpxgq';
  const ivanId = 'cmqjz02dv0001qonbzsommvav';

  // Clear previous notifications to avoid cluttering
  console.log('Clearing old notifications for admin...');
  await prisma.notification.deleteMany({
    where: { userId: adminId }
  });

  console.log('Creating unread notifications for admin...');
  // 1. Unread task notification
  await prisma.notification.create({
    data: {
      userId: adminId,
      title: 'Новая задача',
      content: 'Вам назначена задача: "Срочно проверить конвейер №4"',
      type: 'TASK_ASSIGNED',
      read: false,
      link: '/tasks',
    }
  });

  // 2. Unread comment notification
  await prisma.notification.create({
    data: {
      userId: adminId,
      title: 'Новый комментарий',
      content: 'Анна Тестовая прокомментировала вашу новость: "Новые правила безопасности на заводе"',
      type: 'NEWS_COMMENT',
      read: false,
      link: '/news',
    }
  });

  // 3. Unread like notification
  await prisma.notification.create({
    data: {
      userId: adminId,
      title: 'Новая отметка "Нравится"',
      content: 'Ивану Тестовому понравилась ваша новость: "Новые правила безопасности на заводе"',
      type: 'NEWS_LIKE',
      read: false,
      link: '/news',
    }
  });

  console.log('Creating unread chat message for admin...');
  // Find or create direct conversation between Admin and Anna
  let conversation = await prisma.conversation.findFirst({
    where: {
      isGroup: false,
      participants: {
        every: {
          userId: { in: [adminId, annaId] }
        }
      }
    }
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        isGroup: false,
        createdById: adminId,
        participants: {
          create: [
            { userId: adminId, lastReadAt: new Date(Date.now() - 3600000) }, // 1 hour ago
            { userId: annaId }
          ]
        }
      }
    });
  } else {
    // Reset admin's lastReadAt to 1 hour ago
    await prisma.conversationParticipant.updateMany({
      where: {
        conversationId: conversation.id,
        userId: adminId,
      },
      data: {
        lastReadAt: new Date(Date.now() - 3600000)
      }
    });
  }

  // Create chat message from Anna
  await prisma.chatMessage.create({
    data: {
      conversationId: conversation.id,
      authorId: annaId,
      content: 'Привет! Подскажи, пожалуйста, когда будут готовы результаты проверки конвейера?',
    }
  });

  // Update conversation updatedAt
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() }
  });

  console.log('All test notifications and messages successfully created!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
