import express from 'express';
import controller from '../controllers/attachments.controller.js';
import { verifyTokenMiddleware } from '../../middleware/auth.middleware.js';

const router = express.Router();

// Get attachment by ID
router.get('/:id', verifyTokenMiddleware, controller.getAttachmentById);

// Get attachments by task
router.get('/task/:taskId', verifyTokenMiddleware, controller.getTaskAttachments);

// Create new attachment
router.post('/', verifyTokenMiddleware, controller.createAttachment);

// Update attachment
router.put('/:id', verifyTokenMiddleware, controller.updateAttachment);

// Delete attachment
router.delete('/:id', verifyTokenMiddleware, controller.deleteAttachment);

export default router; 