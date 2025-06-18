import express from 'express';
import controller from '../controllers/comments.controller.js';
import { verifyTokenMiddleware } from '../../middleware/auth.middleware.js';

const router = express.Router();

// Get comment by ID
router.get('/:id', verifyTokenMiddleware, controller.getCommentById);

// Create new comment
router.post('/', verifyTokenMiddleware, controller.createComment);

// Update comment
router.put('/:id', verifyTokenMiddleware, controller.updateComment);

// Delete comment
router.delete('/:id', verifyTokenMiddleware, controller.deleteComment);

export default router; 