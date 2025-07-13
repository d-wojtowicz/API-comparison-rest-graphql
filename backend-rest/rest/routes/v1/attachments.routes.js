import express from 'express';
import attachmentsController from '../../controllers/v1/attachments.controller.js';
import { verifyTokenMiddleware } from '../../../middleware/auth.middleware.js';

const router = express.Router();

// Get attachment by ID
router.get('/:id', verifyTokenMiddleware, attachmentsController.getAttachmentById);

// Create new attachment
router.post('/', verifyTokenMiddleware, attachmentsController.createAttachment);

// Update attachment
router.put('/:id', verifyTokenMiddleware, attachmentsController.updateAttachment);

// Delete attachment
router.delete('/:id', verifyTokenMiddleware, attachmentsController.deleteAttachment);

export default router; 