// server/routes/index.js
// Combine all routes

import express from 'express';
import authRoutes from './auth.js';
import createAdminRouter from './admin.js';
import createDebugRouter from './debug.js';

// Create a function that returns a router with all routes
export default function createRouter(players, worldItems) {
  const router = express.Router();

  // Mount auth routes
  router.use('/auth', authRoutes);

  // Mount admin routes with players access
  router.use('/admin', createAdminRouter(players));
  
  // Mount debug routes with players and worldItems access
  router.use('/debug', createDebugRouter(players, worldItems));

  return router;
}
