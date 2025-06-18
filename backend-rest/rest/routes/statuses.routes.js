import express from 'express';
import { verifyTokenMiddleware, requireAdmin } from '../../middleware/auth.middleware.js';
import controller from '../controllers/statuses.controller.js';

const router = express.Router();

// Get all statuses (admin only)
router.get('/', verifyTokenMiddleware, requireAdmin, controller.getAllStatuses);

// Create new status
router.post('/', verifyTokenMiddleware, requireAdmin, controller.createStatus);

// Update status
router.put('/:id', verifyTokenMiddleware, requireAdmin, controller.updateStatus);

// Delete status
router.delete('/:id', verifyTokenMiddleware, requireAdmin, controller.deleteStatus);

export default router; 