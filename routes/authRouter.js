// routes/auth.js
import { Router } from 'express';
import { hash, compare } from 'bcryptjs';
import { prisma } from '../lib/prisma.js';

const authRouter = Router();

// Render Registration Page
authRouter.get('/register', (req, res) => {
  res.render('register');
});

// Handle Registration Logic
authRouter.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const hashedPassword = await hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword }
    });
    req.session.userId = user.id; // Log them in immediately
    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.status(400).send('Registration failed. Email might already be in use.');
  }
});

// Render Login Page
authRouter.get('/login', (req, res) => {
  res.render('login');
});

// Handle Login Logic
authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && await compare(password, user.password)) {
      req.session.userId = user.id;
      res.redirect('/');
    } else {
      res.status(401).send('Invalid email or password.');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error.');
  }
});

// Handle Logout
authRouter.post('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

export default authRouter;
