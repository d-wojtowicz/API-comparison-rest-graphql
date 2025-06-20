import express from 'express';
import usersController from '../controllers/users.controller.js';
import { verifyTokenMiddleware, requireAdmin } from '../../middleware/auth.middleware.js';

const router = express.Router();

// Get current user
router.get('/me', verifyTokenMiddleware, usersController.getMe);

// Get user by ID
router.get('/:id', verifyTokenMiddleware, usersController.getUserById);

// Get all users (admin only)
router.get('/', verifyTokenMiddleware, requireAdmin, usersController.getAllUsers);

// Register new user
router.post('/register', usersController.register);

// Login user
router.post('/login', usersController.login);

// Change password
router.put('/change-password', verifyTokenMiddleware, usersController.changePassword);

// Update user role (admin only)
router.put('/:id/role', verifyTokenMiddleware, requireAdmin, usersController.updateUserRole);

// Delete user (admin only)
router.delete('/:id', verifyTokenMiddleware, requireAdmin, usersController.deleteUser);

// Dependencies
// Get tasks by assignee
router.get('/:userId/tasks', verifyTokenMiddleware, usersController.getTasksByAssignee);

export default router;