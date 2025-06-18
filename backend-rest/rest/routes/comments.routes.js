import express from 'express';
import controller from '../controllers/comments.controller.js';
// TODO: Import JWT verifyToken

const router = express.Router();

// Get comment by ID
router.get('/:id', controller.getCommentById);

// Create new comment
router.post('/', controller.createComment);

// Update comment
router.put('/:id', controller.updateComment);

// Delete comment
router.delete('/:id', controller.deleteComment);

export default router; 