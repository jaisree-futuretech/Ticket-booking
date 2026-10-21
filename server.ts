import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initDatabase } from './server/db.js';
import { cleanupExpiredHolds } from './server/services/seatService.js';
import authRoutes from './server/routes/auth.js';
import eventsRoutes from './server/routes/events.js';
import bookingsRoutes from './server/routes/bookings.js';
import paymentsRoutes from './server/routes/payments.js';
import ticketsRoutes from './server/routes/tickets.js';
import organizerRoutes from './server/routes/organizer.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const app = express();

// Parse JSON request bodies
app.use(express.json());

// Background periodic hold expiration sweep (runs every 15 seconds)
setInterval(() => {
  try {
    const expiredCount = cleanupExpiredHolds();
    if (expiredCount > 0) {
      console.log(`[Sweeper] Auto-expired ${expiredCount} stale seat hold(s). Seats now available.`);
    }
  } catch (err) {
    console.error('[Sweeper] Error sweeping expired holds:', err);
  }
}, 15000);

async function startServer() {
  // Initialize SQL.js database
  console.log('Initializing database...');
  await initDatabase();
  console.log('Database ready.');

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/events', eventsRoutes);
  app.use('/api/bookings', bookingsRoutes);
  app.use('/api/payments', paymentsRoutes);
  app.use('/api/tickets', ticketsRoutes);
  app.use('/api/organizer', organizerRoutes);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Serve Frontend
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    // Development mode: Mount Vite dev server middlewares
    console.log('Starting Vite in development middleware mode...');
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: Serve built static files
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ReserveSeat Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
