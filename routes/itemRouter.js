// routes/items.js
import { Router } from 'express';
import { prisma } from '../lib/prisma.js'; 
import { authenticateUser } from '../middleware/authMiddleware.js';

const itemRouter = Router();

// Get all listings with optional category filter
itemRouter.get('/', async (req, res) => {
  const { category } = req.query;
  
  // Build query options
  const queryOptions = {
    // Include both AVAILABLE and RESERVED items
    where: { 
        status: { in: ['AVAILABLE', 'RESERVED'] } 
    }, 
    // Sort alphabetically by status (A before R), then by newest
    orderBy: [
        { status: 'asc' }, 
        { createdAt: 'desc' }
    ],
    include: { user: { select: { name: true } } }
  };

  if (category && category !== 'ALL') {
    queryOptions.where.category = category.toUpperCase();
  }

  try {
    const items = await prisma.item.findMany(queryOptions);
    const user = req.session.userId ? req.session.userId : null;
    
    res.render('listings', { 
        title: 'Marketplace Listings | Sennan City JETs', 
        items, 
        currentCategory: category || 'ALL',
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

        // Verify the item is currently available
        const item = await prisma.item.findUnique({
            where: { id: itemId }
        });

        if (!item) {
            req.flash('error_msg', 'Item not found');
            return res.redirect('/listings');
        }

        if (item.status !== 'AVAILABLE') {
            req.flash('error_msg', 'Item is already reserved or sold');
            return res.redirect('/listings');
        }

        // Prevent sellers from reserving their own items
        if (item.userId === userId) {
            req.flash('error_msg', 'You cannot reserve your own item');
            return res.redirect('/listings');
        }

        // Update item with reserveeId and status
        await prisma.item.update({
            where: { id: itemId },
            data: {
                status: 'RESERVED',
                reserveeId: userId
            }
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

        const item = await prisma.item.findUnique({
            where: { id: itemId }
        });

        if (!item) {
            req.flash('error_msg', 'Item not found');
            return res.redirect('/listings');
        }

        // Verify that the person attempting to unreserve is the actual reservee
        if (item.reserveeId !== userId) {
            req.flash('error_msg', 'You are not authorized to unreserve this item');
            return res.redirect('/listings');
        }

        // Clear reservation details
        await prisma.item.update({
            where: { id: itemId },
            data: {
                status: 'AVAILABLE',
                reserveeId: null
            }
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