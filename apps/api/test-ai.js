const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

async function main() {
  const prisma = new PrismaClient();
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log("No user found");
    return;
  }
  
  const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, 'factory-1-local-dev-secret-change-me');
  
  const response = await fetch('http://localhost:3001/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `factory_session=${token}`
    },
    body: JSON.stringify({
      model: "deepseek-v4-flash",
      messages: [{role: "user", content: "Какие у меня задачи?"}]
    })
  });
  
  const text = await response.text();
  console.log("Status:", response.status);
  console.log("Response:", text);
}
main();
