// routes/items.js
import { Router } from 'express';
import { prisma } from '../lib/prisma.js'; 

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
    const user = req.session.userId ? true : false;
    
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

// Handle Item Reservation
itemRouter.post('/:id/reserve', async (req, res) => {
    const itemId = req.params.id;
    const { reserveeName } = req.body;

    try {
        // Update the item status and attach the reservee's name
        await prisma.item.update({
            where: { id: itemId },
            data: {
                status: 'RESERVED',
                reserveeName: reserveeName
            }
        });

        // Submitting updates the UI via a quick page refresh
        res.redirect('/listings');
    } catch (error) {
        console.error("Failed to reserve item:", error);
        res.status(500).send("Error reserving item.");
    }
});

export default itemRouter;