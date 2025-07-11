import express from 'express';
import tasksController from '../../controllers/v1/tasks.controller.js';
import { verifyTokenMiddleware, requireAdmin } from '../../../middleware/auth.middleware.js';

const router = express.Router();

// Get task by ID
router.get('/:id', verifyTokenMiddleware, tasksController.getTaskById);

// Create new task
router.post('/', verifyTokenMiddleware, tasksController.createTask);

// Update task
router.put('/:id', verifyTokenMiddleware, tasksController.updateTask);

// Delete task
router.delete('/:id', verifyTokenMiddleware, requireAdmin, tasksController.deleteTask);

// Assign task
router.put('/:id/assign', verifyTokenMiddleware, tasksController.assignTask);

// Update task status
router.put('/:id/status', verifyTokenMiddleware, tasksController.updateTaskStatus);

// Dependencies
// Get comments for a task
router.get('/:taskId/comments', verifyTokenMiddleware, tasksController.getTaskComments);

// Get attachments for a task
router.get('/:taskId/attachments', verifyTokenMiddleware, tasksController.getTaskAttachments);


export default router; 