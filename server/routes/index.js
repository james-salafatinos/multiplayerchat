// server/routes/index.js
// Combine all routes

import express from 'express';
import authRoutes from './auth.js';
import adminRoutes from './admin.js';

const router = express.Router();

// Mount auth routes
router.use('/auth', authRoutes);

// Mount admin routes
router.use('/admin', adminRoutes);

export default router;
