// routes/items.js
import { Router } from 'express';
import { prisma } from '../lib/prisma.js'; 
import { authenticateUser } from '../middleware/authMiddleware.js';
import { createNotification } from '../lib/notifications.js';

const itemRouter = Router();

// Get all listings with optional category & search filter
itemRouter.get('/', async (req, res) => {
  const { category, search } = req.query;
  
  const queryOptions = {
    where: { 
        status: { in: ['AVAILABLE', 'RESERVED'] } 
    }, 
    orderBy: [
        { status: 'asc' }, 
        { createdAt: 'desc' }
    ],
    include: { user: { select: { name: true } } }
  };

  if (category && category !== 'ALL') {
    queryOptions.where.category = category.toUpperCase();
  }

  if (search && search.trim() !== '') {
    queryOptions.where.OR = [
      { title: { contains: search.trim(), mode: 'insensitive' } },
      { description: { contains: search.trim(), mode: 'insensitive' } }
    ];
  }

  try {
    const items = await prisma.item.findMany(queryOptions);
    const user = req.session.userId ? req.session.userId : null;
    
    res.render('listings', { 
        title: 'Marketplace Listings | Sennan City JETs', 
        items, 
        currentCategory: category || 'ALL',
        searchQuery: search || '',
        user,
        userName: req.session.userName || null
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching items.');
  }
});

// Route: Handle reserving an item (Requires Authentication)
itemRouter.post('/:id/reserve', authenticateUser, async (req, res) => {
    try {
        const itemId = req.params.id;
        const userId = req.session.userId;
        const buyerName = req.session.fullName || req.session.userName || 'A user';

        const item = await prisma.item.findUnique({
            where: { id: itemId },
            include: { user: { select: { id: true, name: true } } }
        });

        if (!item) {
            req.flash('error_msg', 'Item not found');
            return res.redirect('/listings');
        }

        if (item.status !== 'AVAILABLE') {
            req.flash('error_msg', 'Item is already reserved or sold');
            return res.redirect('/listings');
        }

        if (item.userId === userId) {
            req.flash('error_msg', 'You cannot reserve your own item');
            return res.redirect('/listings');
        }

        await prisma.item.update({
            where: { id: itemId },
            data: {
                status: 'RESERVED',
                reserveeId: userId
            }
        });

        // Notify Seller
        await createNotification({
            userId: item.userId,
            type: 'ITEM_RESERVED',
            message: `${buyerName} reserved your item "${item.title}".`,
            link: '/dashboard'
        });

        // Notify Buyer Confirmation
        await createNotification({
            userId: userId,
            type: 'ITEM_RESERVED_CONFIRMATION',
            message: `You reserved "${item.title}" from ${item.user ? item.user.name : 'seller'}.`,
            link: '/dashboard'
        });

        req.flash('success_msg', 'Item reserved successfully!');
        res.redirect('/listings');
    } catch (error) {
        console.error("Error reserving item:", error);
        req.flash('error_msg', 'Error reserving item.');
        res.redirect('/listings');
    }
});

// Route: Handle unreserving an item (Requires Authentication)
itemRouter.post('/:id/unreserve', authenticateUser, async (req, res) => {
    try {
        const itemId = req.params.id;
        const userId = req.session.userId;
        const buyerName = req.session.fullName || req.session.userName || 'The reservee';

        const item = await prisma.item.findUnique({
            where: { id: itemId },
            include: { user: { select: { id: true, name: true } } }
        });

        if (!item) {
            req.flash('error_msg', 'Item not found');
            return res.redirect('/listings');
        }

        if (item.reserveeId !== userId) {
            req.flash('error_msg', 'You are not authorized to unreserve this item');
            return res.redirect('/listings');
        }

        await prisma.item.update({
            where: { id: itemId },
            data: {
                status: 'AVAILABLE',
                reserveeId: null
            }
        });

        // Notify Seller
        await createNotification({
            userId: item.userId,
            type: 'ITEM_UNRESERVED',
            message: `${buyerName} cancelled their reservation for "${item.title}".`,
            link: '/dashboard'
        });

        // Notify Buyer
        await createNotification({
            userId: userId,
            type: 'ITEM_UNRESERVED_CONFIRMATION',
            message: `You cancelled your reservation for "${item.title}".`,
            link: '/listings'
        });

        req.flash('success_msg', 'Reservation cancelled successfully!');
        res.redirect('/listings');
    } catch (error) {
        console.error("Error unreserving item:", error);
        req.flash('error_msg', 'Error unreserving item.');
        res.redirect('/listings');
    }
});

export default itemRouter;