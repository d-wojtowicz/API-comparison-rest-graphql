import express from 'express';
import controller from '../controllers/users.controller.js';
import { verifyTokenMiddleware, requireAdmin } from '../../middleware/auth.middleware.js';

const router = express.Router();

// Get current user
router.get('/me', verifyTokenMiddleware, controller.getMe);

// Get user by ID
router.get('/:id', verifyTokenMiddleware, controller.getUserById);

// Get all users (admin only)
router.get('/', verifyTokenMiddleware, requireAdmin, controller.getAllUsers);

// Register new user
router.post('/register', controller.register);

// Login user
router.post('/login', controller.login);

// Change password
router.put('/change-password', verifyTokenMiddleware, controller.changePassword);

// Update user role (admin only)
router.put('/:id/role', verifyTokenMiddleware, requireAdmin, controller.updateUserRole);

// Delete user (admin only)
router.delete('/:id', verifyTokenMiddleware, requireAdmin, controller.deleteUser);

export default router;