import express from 'express';
import controller from '../controllers/statuses.controller.js';
// TODO: Import JWT verifyToken

const router = express.Router();

// Get all statuses (admin only)
router.get('/', controller.getAllStatuses);

// Create new status
router.post('/', controller.createStatus);

// Update status
router.put('/:id', controller.updateStatus);

// Delete status
router.delete('/:id', controller.deleteStatus);

export default router; 