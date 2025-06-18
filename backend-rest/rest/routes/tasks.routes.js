import express from 'express';
import controller from '../controllers/tasks.controller.js';
import { verifyTokenMiddleware } from '../../middleware/auth.middleware.js';

const router = express.Router();

// Get task by ID
router.get('/:id', verifyTokenMiddleware, controller.getTaskById);

// Get tasks by project
router.get('/project/:projectId', verifyTokenMiddleware, controller.getTasksByProject);

// Get tasks by assignee
router.get('/assignee/:assigneeId', verifyTokenMiddleware, controller.getTasksByAssignee);

// Get tasks by status
router.get('/status/:statusId', verifyTokenMiddleware, controller.getTasksByStatus);

// Create new task
router.post('/', verifyTokenMiddleware, controller.createTask);

// Update task
router.put('/:id', verifyTokenMiddleware, controller.updateTask);

// Delete task
router.delete('/:id', verifyTokenMiddleware, controller.deleteTask);

// Assign task
router.put('/:id/assign', verifyTokenMiddleware, controller.assignTask);

// Update task status
router.put('/:id/status', verifyTokenMiddleware, controller.updateTaskStatus);

export default router; 