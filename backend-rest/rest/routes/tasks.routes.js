import express from 'express';
import controller from '../controllers/tasks.controller.js';
// TODO: Import JWT verifyToken

const router = express.Router();

// Get task by ID
router.get('/:id', controller.getTaskById);

// Get tasks by project
router.get('/project/:projectId', controller.getTasksByProject);

// Get tasks by assignee
router.get('/assignee/:assigneeId', controller.getTasksByAssignee);

// Get tasks by status
router.get('/status/:statusId', controller.getTasksByStatus);

// Create new task
router.post('/', controller.createTask);

// Update task
router.put('/:id', controller.updateTask);

// Delete task
router.delete('/:id', controller.deleteTask);

// Assign task
router.put('/:id/assign', controller.assignTask);

// Update task status
router.put('/:id/status', controller.updateTaskStatus);

export default router; 