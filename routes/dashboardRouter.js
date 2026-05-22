import { Router } from 'express';
import multer, { memoryStorage } from 'multer';
import sharp from 'sharp';
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

            // Process image buffer with sharp
            const processedImageBuffer = await sharp(file.buffer)
                .resize({
                    width: 1200, // Maximum width
                    withoutEnlargement: true // Prevent scaling up smaller images
                })
                .webp({ quality: 80 }) // Convert to WebP format with 80% quality
                .toBuffer();

            // Create a unique filename with .webp extension
            const originalNameWithoutExt = file.originalname.split('.').slice(0, -1).join('.');
            const fileName = `${Date.now()}-${originalNameWithoutExt.replace(/\s+/g, '-')}.webp`;
            
            // Upload processed image to Supabase Storage
            const { data, error } = await supabase.storage
                .from('item-images') // Must match your Supabase bucket name exactly
                .upload(fileName, processedImageBuffer, {
                    contentType: 'image/webp'
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

// POST: Mark Item as Unsold
dashboardRouter.post('/item/:id/unsold', async (req, res) => {
    try {
        // Verify ownership and update status
        await prisma.item.update({
            where: {
                id: req.params.id,
                userId: req.session.userId // Security check: Ensure the user owns this item
            },
            data: {
                status: 'AVAILABLE',
                reserveeName: null // Clear reservee name when marking as unsold
            }
        });
        
        res.redirect('/dashboard');
    } catch (error) {
        console.error("Failed to mark item as unsold:", error);
        res.status(500).send("Error updating item status.");
    }
});

// POST: Edit Item Details
dashboardRouter.post('/item/:id/edit', upload.array('newImages'), async (req, res) => {
    const { title, description, price, category } = req.body;
    const itemId = req.params.id;
    
    // Parse the list of images the user decided to keep from the frontend
    let keptImages = [];
    if (req.body.existingImages) {
        keptImages = Array.isArray(req.body.existingImages) 
            ? req.body.existingImages 
            : [req.body.existingImages];
    }

    try {
        // FETCH THE CURRENT STATE OF THE ITEM FROM POSTGRESQL
        const currentItem = await prisma.item.findUnique({
            where: { id: itemId, userId: req.session.userId }
        });

        if (!currentItem) {
            return res.status(404).send("Item not found or unauthorized.");
        }

        // IDENTIFY DISCARDED IMAGES FOR SUPABASE CLEANUP
        // Filter out public URLs that exist in the database but were omitted by the frontend form
        const imagesToDelete = currentItem.images.filter(imgUrl => !keptImages.includes(imgUrl));

        if (imagesToDelete.length > 0) {
            // Extract just the filename from the full public URL string
            const fileNamesToDelete = imagesToDelete.map(imgUrl => {
                const parts = imgUrl.split('/');
                return parts[parts.length - 1];
            });

            // Trigger the Supabase Storage removal call
            const { error: storageError } = await supabase.storage
                .from('item-images')
                .remove(fileNamesToDelete);

            if (storageError) {
                console.error("Supabase file deletion warning:", storageError);
                // We log the error but don't halt the process, ensuring the database update still succeeds
            }
        }

        // PROCESS AND UPLOAD ANY NEWLY ADDED IMAGES
        let finalImages = [...keptImages]; // Start with the images we kept

        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const processedImageBuffer = await sharp(file.buffer)
                    .resize({ width: 1200, withoutEnlargement: true })
                    .webp({ quality: 80 })
                    .toBuffer();

                const originalNameWithoutExt = file.originalname.split('.').slice(0, -1).join('.');
                const fileName = `${Date.now()}-${originalNameWithoutExt.replace(/\s+/g, '-')}.webp`;
                
                const { error: uploadError } = await supabase.storage
                    .from('item-images')
                    .upload(fileName, processedImageBuffer, { contentType: 'image/webp' });

                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabase.storage
                    .from('item-images')
                    .getPublicUrl(fileName);
                    
                finalImages.push(publicUrlData.publicUrl);
            }
        }

        // UPDATE THE DATABASE WITH THE FINAL OPTIMIZED ARRAY
        await prisma.item.update({
            where: {
                id: itemId,
                userId: req.session.userId 
            },
            data: {
                title: title,
                description: description,
                price: parseFloat(price),
                category: category.toUpperCase(),
                images: finalImages // Saves only the active images
            }
        });

        res.redirect('/dashboard');
    } catch (error) {
        console.error("Failed to update item and manage assets:", error);
        res.status(500).send("Error updating item details.");
    }
});

export default dashboardRouter;