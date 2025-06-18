import express from 'express';
import controller from '../controllers/users.controller.js';
// TODO: Import JWT verifyToken

const router = express.Router();

// Get current user
router.get('/me', controller.getMe);

// Get user by ID
router.get('/:id', controller.getUserById);

// Get all users (admin only)
router.get('/', controller.getAllUsers);

// Register new user
router.post('/register', controller.register);

// Login user
router.post('/login', controller.login);

// Change password
router.put('/change-password', controller.changePassword);

// Update user role (admin only)
router.put('/:id/role', controller.updateUserRole);

// Delete user (admin only)
router.delete('/:id', controller.deleteUser);

export default router;