import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { notifyAllUsersExcept } from '../lib/notifications.js';

const messageBoardRouter = Router();

// Fetch paginated posts
messageBoardRouter.get('/api/posts', async (req, res) => {
  const skip = parseInt(req.query.skip) || 0;
  const take = parseInt(req.query.take) || 3;

  try {
    const posts = await prisma.post.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true } },
        comments: {
          orderBy: { createdAt: 'desc' },
          take: 3,
          include: { user: { select: { name: true } } }
        },
        _count: { select: { comments: true } }
      }
    });
    res.json({ posts, currentUserId: req.session.userId || null });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST: Create Post
messageBoardRouter.post('/api/post', authenticateUser, async (req, res) => {
  try {
    const post = await prisma.post.create({
      data: { content: req.body.content, userId: req.session.userId },
      include: { user: { select: { name: true } }, comments: true }
    });

    // Notify all registered users about the new community board post
    const authorName = post.user ? post.user.name : 'A member';
    const excerpt = req.body.content.length > 50 ? req.body.content.substring(0, 50) + '...' : req.body.content;

    await notifyAllUsersExcept({
      excludeUserId: req.session.userId,
      type: 'NEW_COMMUNITY_POST',
      message: `${authorName} posted on the Community Board: "${excerpt}"`,
      link: '/#community-board'
    });

    res.json(post);
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// POST: Create Comment
messageBoardRouter.post('/api/post/:id/comment', authenticateUser, async (req, res) => {
  try {
    const comment = await prisma.comment.create({
      data: { content: req.body.content, postId: req.params.id, userId: req.session.userId },
      include: { user: { select: { name: true } } }
    });
    res.json(comment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// GET: Fetch paginated comments for a post
messageBoardRouter.get('/api/post/:id/comments', async (req, res) => {
  const skip = parseInt(req.query.skip) || 0;
  const take = parseInt(req.query.take) || 5;

  try {
    const comments = await prisma.comment.findMany({
      where: { postId: req.params.id },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true } } }
    });
    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// DELETE: Authenticated deletion targeting user's own original post
messageBoardRouter.delete('/api/post/:id', authenticateUser, async (req, res) => {
  try {
    const deletedPost = await prisma.post.deleteMany({
      where: {
        id: req.params.id,
        userId: req.session.userId 
      }
    });

    if (deletedPost.count === 0) {
      return res.status(403).json({ error: 'Unauthorized or post not found.' });
    }
    
    res.json({ success: true, message: 'Announcement deleted.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

export default messageBoardRouter;