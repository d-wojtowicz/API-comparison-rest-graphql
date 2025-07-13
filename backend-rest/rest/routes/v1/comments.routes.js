import express from 'express';
import commentsController from '../../controllers/v1/comments.controller.js';
import { verifyTokenMiddleware } from '../../../middleware/auth.middleware.js';

const router = express.Router();

// Get comment by ID
router.get('/:id', verifyTokenMiddleware, commentsController.getCommentById);

// Create new comment
router.post('/', verifyTokenMiddleware, commentsController.createComment);

// Update comment
router.put('/:id', verifyTokenMiddleware, commentsController.updateComment);

// Delete comment
router.delete('/:id', verifyTokenMiddleware, commentsController.deleteComment);

export default router; 