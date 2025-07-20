import express from 'express';
import usersController from '../../controllers/v1/users.controller.js';
import { verifyTokenMiddleware, requireAdmin } from '../../../middleware/auth.middleware.js';
import { endpointDeprecationMiddleware } from '../../../middleware/deprecation.middleware.js';
import { paginationMiddleware } from '../../../middleware/pagination.middleware.js';

const router = express.Router();

// Get current user
router.get('/me', verifyTokenMiddleware, endpointDeprecationMiddleware('2025-06-31', '/api/v2/users/me'), usersController.getMe);

// Get user by ID
router.get('/:id', verifyTokenMiddleware, endpointDeprecationMiddleware('2025-06-31', '/api/v2/users/:id'), usersController.getUserById);

// Get all users (admin only)
router.get(
    '/', 
    verifyTokenMiddleware, 
    requireAdmin, 
    paginationMiddleware({ cursorField: 'user_id' }), 
    endpointDeprecationMiddleware('2025-06-31', '/api/v2/users'), 
    usersController.getAllUsers
);

// Register new user
router.post('/register', endpointDeprecationMiddleware('2025-06-31', '/api/v2/users/register'), usersController.register);

// Login user
router.post('/login', endpointDeprecationMiddleware('2025-06-31', '/api/v2/users/login'), usersController.login);

// Change password
router.put('/change-password', verifyTokenMiddleware, usersController.changePassword);

// Update user role (admin only)
router.put('/:id/role', verifyTokenMiddleware, requireAdmin, endpointDeprecationMiddleware('2025-06-31', '/api/v2/users/:id/role'), usersController.updateUserRole);

// Delete user (admin only)
router.delete('/:id', verifyTokenMiddleware, requireAdmin, usersController.deleteUser);

// Dependencies
// Get tasks by assignee
router.get(
    '/:userId/tasks', 
    verifyTokenMiddleware, 
    paginationMiddleware({ cursorField: 'task_id' }), 
    usersController.getTasksByAssignee
);

export default router;