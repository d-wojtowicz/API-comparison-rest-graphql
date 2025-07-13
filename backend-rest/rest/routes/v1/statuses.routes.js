import express from 'express';
import { verifyTokenMiddleware, requireAdmin, requireSuperAdmin } from '../../../middleware/auth.middleware.js';
import statusesController from '../../controllers/v1/statuses.controller.js';

const router = express.Router();

// Get status by ID
router.get('/:id', verifyTokenMiddleware, statusesController.getStatusById);

// Get all statuses (admin only)
router.get('/', verifyTokenMiddleware, requireAdmin, statusesController.getAllStatuses);

// Create new status (superadmin only)
router.post('/', verifyTokenMiddleware, requireSuperAdmin, statusesController.createStatus);

// Update status (superadmin only)
router.put('/:id', verifyTokenMiddleware, requireSuperAdmin, statusesController.updateStatus);

// Delete status (superadmin only)
router.delete('/:id', verifyTokenMiddleware, requireSuperAdmin, statusesController.deleteStatus);

// Dependencies
// Get tasks by status
router.get('/:statusId/tasks', verifyTokenMiddleware, statusesController.getTasksByStatus);

export default router; 