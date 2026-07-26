import { Router } from 'express';
import multer, { memoryStorage } from 'multer';
import sharp from 'sharp';
import { prisma } from '../lib/prisma.js';
import supabase from '../lib/supabase.js';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { createNotification } from '../lib/notifications.js';

const dashboardRouter = Router();

// Configure Multer to store files in memory temporarily
const storage = memoryStorage();
const upload = multer({ storage: storage });

// Apply auth middleware to protect all routes in this file
dashboardRouter.use(authenticateUser);

// GET Dashboard Home: Fetch user's items, buyer reserved items, and seller reserved items
dashboardRouter.get('/', async (req, res) => {
    try {
        const userId = req.session.userId;

        // 1. Items posted by user as seller (My Active Postings: AVAILABLE or SOLD items)
        const items = await prisma.item.findMany({
            where: { 
                userId: userId,
                status: { in: ['AVAILABLE', 'SOLD'] }
            },
            orderBy: { createdAt: 'desc' }
        });

        // 2. Items reserved by current user (Buyer View)
        const buyerReservedItems = await prisma.item.findMany({
            where: { reserveeId: userId, status: 'RESERVED' },
            orderBy: { updatedAt: 'desc' },
            include: {
                user: { select: { id: true, name: true } }
            }
        });

        // 3. Seller's items currently reserved by others (Dedicated Seller Section)
        const sellerReservedItems = await prisma.item.findMany({
            where: { userId: userId, status: 'RESERVED' },
            orderBy: { updatedAt: 'desc' }
        });

        const populatedSellerReserved = await Promise.all(sellerReservedItems.map(async (item) => {
            if (item.reserveeId) {
                const reservee = await prisma.user.findUnique({
                    where: { id: item.reserveeId },
                    select: { name: true }
                });
                return { ...item, reserveeName: reservee?.name || 'Unknown User' };
            }
            return item;
        }));

        res.render('dashboard', {
            title: 'Dashboard | Sennan City JETs',
            user: userId,
            items: items,
            buyerReservedItems,
            sellerReservedItems: populatedSellerReserved,
            userName: req.session.userName || null,
            fullName: req.session.fullName || null,
        });
    } catch (error) {
        console.error("Error loading dashboard:", error);
        res.status(500).send("Error loading dashboard");
    }
});

// POST Create new item with Multiple Image Uploads
dashboardRouter.post('/item', upload.array('images', 5), async (req, res) => {
    const { title, description, notes, originalPrice, price, category, contactInfo } = req.body;
    let imageUrls = [];

    try {
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const processedImageBuffer = await sharp(file.buffer)
                    .resize({ width: 1200, withoutEnlargement: true })
                    .webp({ quality: 80 })
                    .toBuffer();

                const originalNameWithoutExt = file.originalname
                    .split('.')
                    .slice(0, -1)
                    .join('.')
                    .replace(/[^a-zA-Z0-9]/g, '-');
                
                const fileName = `${Date.now()}-${originalNameWithoutExt}.webp`;
                
                const { error } = await supabase.storage
                    .from('item-images')
                    .upload(fileName, processedImageBuffer, { contentType: 'image/webp' });

                if (error) throw error;

                const { data: { publicUrl }, error: publicUrlError } = await supabase.storage
                    .from('item-images')
                    .getPublicUrl(fileName);
                
                if (publicUrlError) throw publicUrlError;
                
                imageUrls.push(publicUrl);
            }
        }

        await prisma.item.create({
            data: {
                title,
                description,
                notes: notes || null,
                originalPrice: originalPrice ? parseFloat(originalPrice) : null,
                price: parseFloat(price),
                category: category.toUpperCase(),
                images: imageUrls,
                contactInfo,
                userId: req.session.userId
            }
        });

        req.flash('success_msg', 'Listing created successfully!');
        res.redirect('/dashboard');
    } catch (error) {
        console.error("Error creating item with multiple images:", error);
        req.flash('error_msg', 'Error creating item. Please check your images.');
        res.redirect('/dashboard');
    }
});

// POST: Clear Reservation
dashboardRouter.post('/item/:id/clear', async (req, res) => {
    try {
        const item = await prisma.item.findFirst({
            where: { id: req.params.id, userId: req.session.userId }
        });

        if (item) {
            const previousReserveeId = item.reserveeId;

            await prisma.item.update({
                where: { id: item.id },
                data: {
                    status: 'AVAILABLE',
                    reserveeId: null
                }
            });

            if (previousReserveeId) {
                const sellerName = req.session.fullName || 'The seller';
                await createNotification({
                    userId: previousReserveeId,
                    type: 'RESERVATION_CLEARED',
                    message: `${sellerName} cleared your reservation for "${item.title}".`,
                    link: '/listings'
                });
            }
        }
        
        req.flash('success_msg', 'Reservation cleared.');
        res.redirect('/dashboard');
    } catch (error) {
        console.error("Failed to clear reservation:", error);
        req.flash('error_msg', 'Error clearing reservation.');
        res.redirect('/dashboard');
    }
});

// POST: Mark Item as Sold
dashboardRouter.post('/item/:id/sold', async (req, res) => {
    try {
        await prisma.item.updateMany({
            where: {
                id: req.params.id,
                userId: req.session.userId
            },
            data: {
                status: 'SOLD'
            }
        });
        
        req.flash('success_msg', 'Item marked as sold.');
        res.redirect('/dashboard');
    } catch (error) {
        console.error("Failed to mark item as sold:", error);
        req.flash('error_msg', 'Error updating item status.');
        res.redirect('/dashboard');
    }
});

// POST: Mark Item as Unsold
dashboardRouter.post('/item/:id/unsold', async (req, res) => {
    try {
        await prisma.item.updateMany({
            where: {
                id: req.params.id,
                userId: req.session.userId
            },
            data: {
                status: 'AVAILABLE',
                reserveeId: null
            }
        });
        
        req.flash('success_msg', 'Item marked as unsold.');
        res.redirect('/dashboard');
    } catch (error) {
        console.error("Failed to mark item as unsold:", error);
        req.flash('error_msg', 'Error updating item status.');
        res.redirect('/dashboard');
    }
});

// POST: Edit Item Details
dashboardRouter.post('/item/:id/edit', upload.array('newImages'), async (req, res) => {
    const { title, description, notes, originalPrice, price, category, contactInfo } = req.body;
    const itemId = req.params.id;
    
    let keptImages = [];
    if (req.body.existingImages) {
        keptImages = Array.isArray(req.body.existingImages) 
            ? req.body.existingImages 
            : [req.body.existingImages];
    }

    try {
        const currentItem = await prisma.item.findFirst({
            where: { id: itemId, userId: req.session.userId }
        });

        if (!currentItem) {
            req.flash('error_msg', 'Item not found or unauthorized.');
            return res.redirect('/dashboard');
        }

        const imagesToDelete = currentItem.images.filter(imgUrl => !keptImages.includes(imgUrl));

        if (imagesToDelete.length > 0) {
            const fileNamesToDelete = imagesToDelete.map(imgUrl => {
                const parts = imgUrl.split('/');
                return parts[parts.length - 1];
            });

            const { error: storageError } = await supabase.storage
                .from('item-images')
                .remove(fileNamesToDelete);

            if (storageError) {
                console.error("Supabase file deletion warning:", storageError);
            }
        }

        let finalImages = [...keptImages];

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

        await prisma.item.updateMany({
            where: {
                id: itemId,
                userId: req.session.userId 
            },
            data: {
                title,
                description,
                notes: notes || null,
                originalPrice: originalPrice ? parseFloat(originalPrice) : null,
                price: parseFloat(price),
                category: category.toUpperCase(),
                images: finalImages,
                contactInfo
            }
        });

        req.flash('success_msg', 'Item updated successfully.');
        res.redirect('/dashboard');
    } catch (error) {
        console.error("Failed to update item and manage assets:", error);
        req.flash('error_msg', 'Error updating item details.');
        res.redirect('/dashboard');
    }
});

// POST: Delete Item
dashboardRouter.post('/item/:id/delete', async (req, res) => {
    const itemId = req.params.id;

    try {
        const itemToDelete = await prisma.item.findFirst({
            where: { id: itemId, userId: req.session.userId }
        });

        if (!itemToDelete) {
            req.flash('error_msg', 'Item not found or unauthorized.');
            return res.redirect('/dashboard');
        }

        const fileNamesToDelete = itemToDelete.images.map(imgUrl => {
            const parts = imgUrl.split('/');
            return parts[parts.length - 1];
        });
        
        await prisma.item.deleteMany({
            where: { id: itemId, userId: req.session.userId }
        });

        if (fileNamesToDelete.length > 0) {
            const { error: storageError } = await supabase.storage
                .from('item-images')
                .remove(fileNamesToDelete);

            if (storageError) {
                console.error("Supabase file deletion warning:", storageError);
            }
        }

        req.flash('success_msg', 'Item deleted successfully.');
        res.redirect('/dashboard');
    } catch (error) {
        console.error("Failed to delete item and associated assets:", error);
        req.flash('error_msg', 'Error deleting item.');
        res.redirect('/dashboard');
    }
});

dashboardRouter.post('/edit-name', async (req, res) => {
    const { name } = req.body;

    try {
        await prisma.user.update({
            where: { id: req.session.userId },
            data: { name: name }
        });

        req.session.userName = name.split(' ')[0];
        req.session.fullName = name;

        req.flash('success_msg', 'Name updated successfully.');
        res.redirect('/dashboard');
    } catch (error) {
        console.error("Failed to update user name:", error);
        req.flash('error_msg', 'Error updating name.');
        res.redirect('/dashboard');
    }
});

// POST: Mark notification as read
dashboardRouter.post('/notifications/mark-read/:id', async (req, res) => {
    try {
        await prisma.notification.updateMany({
            where: { id: req.params.id, userId: req.session.userId },
            data: { isRead: true }
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
});

// POST: Mark all notifications as read
dashboardRouter.post('/notifications/mark-all-read', async (req, res) => {
    try {
        await prisma.notification.updateMany({
            where: { userId: req.session.userId, isRead: false },
            data: { isRead: true }
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
});

export default dashboardRouter;