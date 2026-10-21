import express, { Response } from 'express';
import bcrypt from 'bcryptjs';
import { queryOne, run } from '../db.js';
import { AuthenticatedRequest, generateToken, requireAuth } from '../auth.js';

const router = express.Router();

// Register new user
router.post('/register', (req, res: Response) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  const cleanEmail = email.toLowerCase().trim();
  const userRole = role === 'ORGANIZER' ? 'ORGANIZER' : 'ATTENDEE';

  // Check existing user
  const existing = queryOne('SELECT id FROM users WHERE email = ?', [cleanEmail]);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email address already exists.' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  run(`
    INSERT INTO users (id, name, email, password_hash, role)
    VALUES (?, ?, ?, ?, ?)
  `, [userId, name.trim(), cleanEmail, passwordHash, userRole]);

  const token = generateToken({
    id: userId,
    name: name.trim(),
    email: cleanEmail,
    role: userRole,
  });

  return res.status(201).json({
    token,
    user: {
      id: userId,
      name: name.trim(),
      email: cleanEmail,
      role: userRole,
    },
  });
});

// Login
router.post('/login', (req, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const cleanEmail = email.toLowerCase().trim();
  const user = queryOne<{
    id: string;
    name: string;
    email: string;
    password_hash: string;
    role: 'ORGANIZER' | 'ATTENDEE';
  }>('SELECT id, name, email, password_hash, role FROM users WHERE email = ?', [cleanEmail]);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email address or password.' });
  }

  const token = generateToken({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

// Demo account switcher for easy evaluation
router.post('/switch-demo', (req, res: Response) => {
  const { role, email } = req.body;
  const targetEmail = email || (role === 'ORGANIZER' ? 'organizer@eventflow.com' : 'attendee@eventflow.com');

  const user = queryOne<{
    id: string;
    name: string;
    email: string;
    role: 'ORGANIZER' | 'ATTENDEE';
  }>('SELECT id, name, email, role FROM users WHERE email = ?', [targetEmail]);

  if (!user) {
    return res.status(404).json({ error: 'Demo account not found' });
  }

  const token = generateToken(user);
  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

// Get current profile
router.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  return res.json({ user: req.user });
});

export default router;
