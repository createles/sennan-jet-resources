// app.js
import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import session from 'express-session';
import flash from 'connect-flash';
import { prisma } from './lib/prisma.js';
import authRouter from './routes/authRouter.js';
import itemRouter from './routes/itemRouter.js';
import dashboardRouter from './routes/dashboardRouter.js';
import indexRouter from './routes/indexRouter.js';
import messageBoardRouter from './routes/messageBoardRouter.js';

const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve Static Files
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'sennan_city_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 1000 * 60 * 60 * 24 } // 1 day
}));

// Connect-Flash Middleware
app.use(flash());

// Expose flash messages & user notifications to views
app.use(async (req, res, next) => {
  const success_msg = req.flash('success_msg');
  const error_msg = req.flash('error_msg');
  res.locals.success_msg = success_msg.length > 0 ? success_msg[0] : null;
  res.locals.error_msg = error_msg.length > 0 ? error_msg[0] : null;

  res.locals.user = req.session.userId || null;
  res.locals.userName = req.session.userName || null;
  res.locals.fullName = req.session.fullName || null;
  res.locals.unreadCount = 0;
  res.locals.recentNotifications = [];

  if (req.session.userId) {
    try {
      const [unreadCount, recentNotifications] = await Promise.all([
        prisma.notification.count({
          where: { userId: req.session.userId, isRead: false }
        }),
        prisma.notification.findMany({
          where: { userId: req.session.userId },
          orderBy: { createdAt: 'desc' },
          take: 10
        })
      ]);
      res.locals.unreadCount = unreadCount;
      res.locals.recentNotifications = recentNotifications;
    } catch (error) {
      console.error("Error loading notifications in middleware:", error);
    }
  }
  next();
});

// Auth routes
app.use('/auth', authRouter);

// Item routes
app.use('/listings', itemRouter);

// Dashboard routes
app.use('/dashboard', dashboardRouter);

app.use('/board', messageBoardRouter);

// Homepage route
app.use('/', indexRouter);

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});