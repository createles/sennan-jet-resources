import { prisma } from './prisma.js';

//Creates an in-app notification for a specific user
export async function createNotification({ userId, type, message, link = null }) {
  if (!userId) return null;
  try {
    return await prisma.notification.create({
      data: {
        userId,
        type,
        message,
        link
      }
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

// Sends a notification to all registered users except the specified excludeUserId (e.g. post author)
export async function notifyAllUsersExcept({ excludeUserId, type, message, link = null }) {
  try {
    const whereClause = excludeUserId ? { id: { not: excludeUserId } } : {};
    const users = await prisma.user.findMany({
      where: whereClause,
      select: { id: true }
    });

    if (users.length === 0) return;

    await prisma.notification.createMany({
      data: users.map(u => ({
        userId: u.id,
        type,
        message,
        link
      }))
    });
  } catch (error) {
    console.error('Error notifying all users:', error);
  }
}
