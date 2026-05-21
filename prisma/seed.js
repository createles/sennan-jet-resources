// prisma/seed.js
import { prisma } from '../lib/prisma.js'
import { hash } from 'bcryptjs';

async function main() {
  // Clear existing data (optional, but good for resetting)
  await prisma.item.deleteMany({});
  await prisma.user.deleteMany({});

  const hashedPassword = await hash('password123', 10);

  // Create a mock JET user
  const user1 = await prisma.user.create({
    data: {
      name: 'Alex (Leaving JET)',
      email: 'alex@example.com',
      password: hashedPassword,
    },
  });

  // Create mock items styled for a Sayonara Sale in Sennan City
  const items = await prisma.item.createMany({
    data: [
      {
        title: 'Sakai Cutlery Chef Knife',
        description: 'Locally crafted Sakai knife. Excellent condition, very sharp!',
        price: 3500,
        category: 'KITCHEN',
        images: ['https://via.placeholder.com/400x300?text=Sakai+Knife'],
        userId: user1.id,
      },
      {
        title: 'Nitori N-Sleep Bed Frame (Single)',
        description: 'Need to get rid of this before I leave! Avoided sodai gomi fee.',
        price: 2000,
        category: 'FURNITURE',
        images: ['https://via.placeholder.com/400x300?text=Bed+Frame'],
        userId: user1.id,
      },
      {
        title: 'Haier Washing Machine (4.5kg)',
        description: 'Works perfectly. Pick up near Sennan Long Park.',
        price: 4000,
        category: 'APPLIANCES',
        images: ['https://via.placeholder.com/400x300?text=Washing+Machine'],
        userId: user1.id,
      },
      {
        title: 'City Bicycle (Mamachari)',
        description: 'Comes with a basket. Perfect for riding down to Marble Beach.',
        price: 1500,
        category: 'OTHERS',
        images: ['https://via.placeholder.com/400x300?text=Bicycle'],
        userId: user1.id,
      },
      {
        title: 'Senshu Towel Set (Unused)',
        description: 'Gifted to me but I have too many. High-quality local cotton.',
        price: 1000,
        category: 'OTHERS',
        images: ['https://via.placeholder.com/400x300?text=Senshu+Towels'],
        userId: user1.id,
      }
    ],
  });

  console.log(`Seeding finished. Created users and items.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });