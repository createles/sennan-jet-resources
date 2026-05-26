import Router from 'express';
import { prisma } from '../lib/prisma.js';

const indexRouter = Router();

indexRouter.get('/', async (req, res) => {
  try {
    const latestItems = await prisma.item.findMany({ // fetch 5 latest items for scrollable marketplace section
      where: { status: 'AVAILABLE' },
      orderBy: { createdAt: 'asc' },
      take: 5, // Only grab the newest 5 items
      include: { user: { select: { name: true } } }
    });

    res.render('index', { 
      title: 'Sennan City JETs', 
      user: req.session.userId,
      items: latestItems, // Pass items to the view
      userName: req.session.userName || null
    });
  } catch (error) {
    console.error("Failed to load homepage items:", error);
    // Render the page even if items fail to load, passing an empty array
    res.render('index', { 
      title: 'Sennan City JETs', 
      user: req.session.userId,
      items: [],
      userName: req.session.userName || null
    });
  }
});

export default indexRouter;