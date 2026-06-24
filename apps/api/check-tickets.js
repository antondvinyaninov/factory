const { PrismaClient } = require('@prisma/client');
async function main() {
  const prisma = new PrismaClient();
  const user = await prisma.user.findFirst();
  const tickets = await prisma.ticket.findMany({
    where: {
      OR: [
        { authorId: user.id },
        { assigneeId: user.id }
      ]
    }
  });
  console.log("User:", user.email);
  console.log("Tickets:", tickets);
}
main();
