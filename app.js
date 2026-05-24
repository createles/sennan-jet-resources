// app.js
import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import session from 'express-session';
import authRouter from './routes/authRouter.js';
import itemRouter from './routes/itemRouter.js';
import dashboardRouter from './routes/dashboardRouter.js';
import indexRouter from './routes/indexRouter.js';

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

// Auth routes
app.use('/auth', authRouter);

// Item routes
app.use('/listings', itemRouter);

// Dashboard routes
app.use('/dashboard', dashboardRouter);

// Homepage route
app.use('/', indexRouter);

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});