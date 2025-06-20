import express from 'express';
import projectsController from '../controllers/projects.controller.js';
import { verifyTokenMiddleware, requireAdmin } from '../../middleware/auth.middleware.js';

const router = express.Router();

// Get project by ID
router.get('/:id', verifyTokenMiddleware, projectsController.getProjectById);

// Get all projects (admin only)
router.get('/', verifyTokenMiddleware, requireAdmin, projectsController.getAllProjects);

// Get user's projects
router.get('/my', verifyTokenMiddleware, projectsController.getMyProjects);

// Get project members
router.get('/:id/members', verifyTokenMiddleware, projectsController.getProjectMembers);

// Create new project
router.post('/', verifyTokenMiddleware, projectsController.createProject);

// Update project
router.put('/:id', verifyTokenMiddleware, projectsController.updateProject);

// Delete project
router.delete('/:id', verifyTokenMiddleware, projectsController.deleteProject);

// Add project member
router.post('/:id/members', verifyTokenMiddleware, projectsController.addProjectMember);

// Remove project member
router.delete('/:id/members/:userId', verifyTokenMiddleware, projectsController.removeProjectMember);

// Dependencies
// Get tasks by project
router.get('/:projectId/tasks', verifyTokenMiddleware, projectsController.getTasksByProject);


export default router; 