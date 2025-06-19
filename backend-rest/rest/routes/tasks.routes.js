import express from 'express';
import tasksController from '../controllers/tasks.controller.js';
import { verifyTokenMiddleware, requireAdmin } from '../../middleware/auth.middleware.js';

const router = express.Router();

// Get task by ID
router.get('/:id', verifyTokenMiddleware, tasksController.getTaskById);

// Get tasks by project
router.get('/project/:projectId', verifyTokenMiddleware, tasksController.getTasksByProject);

// Get tasks by assignee
router.get('/assignee/:assigneeId', verifyTokenMiddleware, tasksController.getTasksByAssignee);

// Get tasks by status (admin only)
router.get('/status/:statusId', verifyTokenMiddleware, requireAdmin, tasksController.getTasksByStatus);

// Get comments for a task
router.get('/:taskId/comments', verifyTokenMiddleware, tasksController.getTaskComments);

// Create new task
router.post('/', verifyTokenMiddleware, tasksController.createTask);

// Update task
router.put('/:id', verifyTokenMiddleware, tasksController.updateTask);

// Delete task
router.delete('/:id', verifyTokenMiddleware, tasksController.deleteTask);

// Assign task
router.put('/:id/assign', verifyTokenMiddleware, tasksController.assignTask);

// Update task status
router.put('/:id/status', verifyTokenMiddleware, tasksController.updateTaskStatus);

export default router; 