import { PrismaClient } from './apps/api/node_modules/@prisma/client/index.js';
const prisma = new PrismaClient();
prisma.user.findMany().then(u => {
  console.log('Users count:', u.length);
  console.log(u.map(x => x.name));
  process.exit(0);
});
