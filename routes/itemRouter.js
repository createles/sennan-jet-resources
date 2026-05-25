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
        title: 'Marketplace Listings | JET Resource Site', 
        items, 
        currentCategory: category || 'ALL',
        user
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
            return res.status(404).send("Item not found");
        }

        if (item.status !== 'AVAILABLE') {
            return res.status(400).send("Item is already reserved or sold");
        }

        // Prevent sellers from reserving their own items
        if (item.userId === userId) {
            return res.status(400).send("You cannot reserve your own item");
        }

        // Update item with reserveeId and status
        await prisma.item.update({
            where: { id: itemId },
            data: {
                status: 'RESERVED',
                reserveeId: userId
            }
        });

        res.redirect('/listings');
    } catch (error) {
        console.error("Error reserving item:", error);
        res.status(500).send("Internal Server Error");
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
            return res.status(404).send("Item not found");
        }

        // Verify that the person attempting to unreserve is the actual reservee
        if (item.reserveeId !== userId) {
            return res.status(403).send("You are not authorized to unreserve this item");
        }

        // Clear reservation details
        await prisma.item.update({
            where: { id: itemId },
            data: {
                status: 'AVAILABLE',
                reserveeId: null
            }
        });

        res.redirect('/listings');
    } catch (error) {
        console.error("Error unreserving item:", error);
        res.status(500).send("Internal Server Error");
    }
});
export default itemRouter;