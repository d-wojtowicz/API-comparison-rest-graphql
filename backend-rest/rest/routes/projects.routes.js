import express from 'express';
import controller from '../controllers/projects.controller.js';
import { verifyTokenMiddleware, requireAdmin } from '../../middleware/auth.middleware.js';

const router = express.Router();

// Get project by ID
router.get('/:id', verifyTokenMiddleware, controller.getProjectById);

// Get all projects (admin only)
router.get('/', verifyTokenMiddleware, requireAdmin, controller.getAllProjects);

// Get user's projects
router.get('/my', verifyTokenMiddleware, controller.getMyProjects);

// Get project members
router.get('/:id/members', verifyTokenMiddleware, controller.getProjectMembers);

// Create new project
router.post('/', verifyTokenMiddleware, controller.createProject);

// Update project
router.put('/:id', verifyTokenMiddleware, controller.updateProject);

// Delete project
router.delete('/:id', verifyTokenMiddleware, controller.deleteProject);

// Add project member
router.post('/:id/members', verifyTokenMiddleware, controller.addProjectMember);

// Remove project member
router.delete('/:id/members/:userId', verifyTokenMiddleware, controller.removeProjectMember);

export default router; 