import { Router } from 'express';
import multer, { memoryStorage } from 'multer';
import { prisma } from '../lib/prisma.js';
import supabase from '../lib/supabase.js';
import { authenticateUser } from '../middleware/authMiddleware.js';

const dashboardRouter = Router();

// Configure Multer to store files in memory temporarily
const storage = memoryStorage();
const upload = multer({ storage: storage });

// Apply auth middleware to protect all routes in this file
dashboardRouter.use(authenticateUser);

// GET Dashboard Home: Fetch user's items
dashboardRouter.get('/', async (req, res) => {
    try {
        const items = await prisma.item.findMany({
            where: { userId: req.session.userId },
            orderBy: { createdAt: 'desc' }
        });
        res.render('dashboard', { title: 'My Dashboard | Sennan JETs', items });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error loading dashboard");
    }
});

// POST Create new item with Image Upload
dashboardRouter.post('/item', upload.single('image'), async (req, res) => {
    const { title, description, price, category } = req.body;
    let imageUrls = [];

    try {
        // Upload image to Supabase if a file was provided
        if (req.file) {
            const file = req.file;
            // Create a unique filename to prevent overwrites
            const fileName = `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
            
            const { data, error } = await supabase.storage
                .from('item-images') // Must match your Supabase bucket name exactly
                .upload(fileName, file.buffer, {
                    contentType: file.mimetype
                });

            if (error) throw error;

            // Retrieve the public URL for the newly uploaded image
            const { data: { publicUrl }, error: publicUrlError }  = await supabase.storage
                .from('item-images')
                .getPublicUrl(fileName);
            
            if (publicUrlError) throw publicUrlError; // Handle errors from getting the public URL
            imageUrls.push(publicUrl);
        }

        // Create the item record in PostgreSQL via Prisma
        await prisma.item.create({
            data: {
                title,
                description,
                price: parseFloat(price),
                category: category.toUpperCase(),
                images: imageUrls,
                userId: req.session.userId
            }
        });

        res.redirect('/dashboard');
    } catch (error) {
        console.error("Error creating item:", error);
        res.status(500).send("Error creating item. Please check your image size and type.");
    }
});

// POST: Clear Reservation
dashboardRouter.post('/item/:id/clear', async (req, res) => {
    try {
        // Verify ownership and update status
        await prisma.item.update({
            where: {
                id: req.params.id,
                userId: req.session.userId // Security check: Ensure the user owns this item
            },
            data: {
                status: 'AVAILABLE',
                reserveeName: null // Remove the reservee's name
            }
        });
        
        res.redirect('/dashboard');
    } catch (error) {
        console.error("Failed to clear reservation:", error);
        res.status(500).send("Error clearing reservation.");
    }
});

// POST: Mark Item as Sold
dashboardRouter.post('/item/:id/sold', async (req, res) => {
    try {
        // Verify ownership and update status
        await prisma.item.update({
            where: {
                id: req.params.id,
                userId: req.session.userId // Security check: Ensure the user owns this item
            },
            data: {
                status: 'SOLD'
            }
        });
        
        res.redirect('/dashboard');
    } catch (error) {
        console.error("Failed to mark item as sold:", error);
        res.status(500).send("Error updating item status.");
    }
});

dashboardRouter.post('/item/:id/edit', async (req, res) => {
  const { title, description, price, category, images } = req.body;

  try {
    await prisma.item.update({
      where: {
        id: req.params.id,
        userId: req.session.userId
      },
      data: {
        title: title,
        description: description,
        price: parseFloat(price),
        category: category.toUpperCase(),
        images: images
      }
    })

    res.redirect('/dashboard');
  } catch (error) {
    console.error("Failed to update item:", error);
    res.status(500).send("Error updating item details.")
  }
});

export default dashboardRouter;