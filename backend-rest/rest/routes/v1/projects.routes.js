import express from 'express';
import projectsController from '../../controllers/v1/projects.controller.js';
import { verifyTokenMiddleware, requireAdmin } from '../../../middleware/auth.middleware.js';
import { paginationMiddleware } from '../../../middleware/pagination.middleware.js';

const router = express.Router();

// Get user's projects
router.get(
    '/my', 
    verifyTokenMiddleware, 
    paginationMiddleware({ cursorField: 'project_id' }), 
    projectsController.getMyProjects
);

// Get project by ID
router.get('/:id', verifyTokenMiddleware, projectsController.getProjectById);

// Get all projects (admin only)
router.get(
    '/', 
    verifyTokenMiddleware, 
    requireAdmin, 
    paginationMiddleware({ cursorField: 'project_id' }), 
    projectsController.getAllProjects
);

// Get project members
router.get('/:id/members', verifyTokenMiddleware, projectsController.getProjectMembers);

// Create new project
router.post('/', verifyTokenMiddleware, requireAdmin, projectsController.createProject);

// Update project
router.put('/:id', verifyTokenMiddleware, requireAdmin, projectsController.updateProject);

// Delete project
router.delete('/:id', verifyTokenMiddleware, requireAdmin, projectsController.deleteProject);

// Add project member
router.post('/:id/members', verifyTokenMiddleware, requireAdmin, projectsController.addProjectMember);

// Remove project member
router.delete('/:id/members/:userId', verifyTokenMiddleware, requireAdmin, projectsController.removeProjectMember);

// Dependencies
// Get tasks by project
router.get(
    '/:projectId/tasks', 
    verifyTokenMiddleware, 
    paginationMiddleware({ cursorField: 'task_id' }), 
    projectsController.getTasksByProject
);

export default router; 