import express from 'express';
import controller from '../controllers/attachments.controller.js';
// TODO: Import JWT verifyToken

const router = express.Router();

// Get attachment by ID
router.get('/:id', controller.getAttachmentById);

// Create new attachment
router.post('/', controller.createAttachment);

// Update attachment
router.put('/:id', controller.updateAttachment);

// Delete attachment
router.delete('/:id', controller.deleteAttachment);

export default router; 