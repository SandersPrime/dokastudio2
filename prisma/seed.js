// prisma/seed.js

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // ─── Admin user ────────────────────────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 10),
      name: 'Admin User',
      role: 'ADMIN',
    },
  });

  console.log(`✅ Admin user: ${admin.email}`);

  // ─── Demo author ───────────────────────────────────────────────────────────
  const demoAuthor = await prisma.user.upsert({
    where: { email: 'author@example.com' },
    update: {},
    create: {
      email: 'author@example.com',
      passwordHash: await bcrypt.hash('author123', 10),
      name: 'Demo Author',
      role: 'AUTHOR',
    },
  });

  console.log(`✅ Demo author: ${demoAuthor.email}`);

  // ─── Demo quizzes ──────────────────────────────────────────────────────────
  // Use findFirst + conditional create for idempotency (Quiz has no unique slug field)
  let quiz1 = await prisma.quiz.findFirst({
    where: { title: 'JavaScript Basics', authorId: demoAuthor.id },
  });

  if (!quiz1) {
    quiz1 = await prisma.quiz.create({
      data: {
        title: 'JavaScript Basics',
        description: 'Test your knowledge of JavaScript fundamentals',
        isPublished: true,
        authorId: demoAuthor.id,
        questions: {
          create: [
            {
              text: 'Что выведет console.log(typeof null)?',
              type: 'TEXT',
              points: 100,
              order: 0,
              timeLimit: 30,
              answers: {
                create: [
                  { text: 'object', isCorrect: true, order: 0 },
                  { text: 'null', isCorrect: false, order: 1 },
                  { text: 'undefined', isCorrect: false, order: 2 },
                  { text: 'string', isCorrect: false, order: 3 },
                ],
              },
            },
            {
              text: 'Какой метод добавляет элемент в конец массива?',
              type: 'TEXT',
              points: 100,
              order: 1,
              timeLimit: 30,
              answers: {
                create: [
                  { text: 'push()', isCorrect: true, order: 0 },
                  { text: 'pop()', isCorrect: false, order: 1 },
                  { text: 'shift()', isCorrect: false, order: 2 },
                  { text: 'unshift()', isCorrect: false, order: 3 },
                ],
              },
            },
          ],
        },
      },
    });
  }

  let quiz2 = await prisma.quiz.findFirst({
    where: { title: 'Web Development Quiz', authorId: demoAuthor.id },
  });

  if (!quiz2) {
    quiz2 = await prisma.quiz.create({
      data: {
        title: 'Web Development Quiz',
        description: 'HTML, CSS, and JavaScript knowledge test',
        isPublished: true,
        authorId: demoAuthor.id,
        questions: {
          create: [
            {
              text: 'Какой тег используется для создания гиперссылки в HTML?',
              type: 'TEXT',
              points: 100,
              order: 0,
              timeLimit: 30,
              answers: {
                create: [
                  { text: '<a>', isCorrect: true, order: 0 },
                  { text: '<link>', isCorrect: false, order: 1 },
                  { text: '<href>', isCorrect: false, order: 2 },
                  { text: '<url>', isCorrect: false, order: 3 },
                ],
              },
            },
          ],
        },
      },
    });
  }

  console.log(`✅ Demo quizzes ready: "${quiz1.title}", "${quiz2.title}"`);

  // ─── Demo equipment product ────────────────────────────────────────────────
  const product = await prisma.equipmentProduct.upsert({
    where: { slug: 'professional-microphone' },
    update: {},
    create: {
      title: 'Professional Microphone',
      slug: 'professional-microphone',
      description:
        'High-quality microphone for live streaming and recording. Noise cancellation, USB-C connectivity, adjustable stand.',
      shortDescription: 'Pro USB-C microphone with noise cancellation',
      category: 'audio',
      price: 29999,
      rentalPriceDay: 999,
      depositAmount: 5000,
      stockQty: 5,
      availableForSale: true,
      availableForRent: true,
      isPublished: true,
    },
  });

  console.log(`✅ Equipment product ready: "${product.title}"`);

  console.log('\nDatabase seeding completed successfully!');
}

main()
  .catch((error) => {
    console.error('Error during seeding:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
