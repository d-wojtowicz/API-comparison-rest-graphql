import express from 'express';
import controller from '../controllers/projects.controller.js';
// TODO: Import JWT verifyToken

const router = express.Router();

// Get project by ID
router.get('/:id', controller.getProjectById);

// Get all projects (admin only)
router.get('/', controller.getAllProjects);

// Get user's projects
router.get('/my', controller.getMyProjects);

// Get project members
router.get('/:id/members', controller.getProjectMembers);

// Create new project
router.post('/', controller.createProject);

// Update project
router.put('/:id', controller.updateProject);

// Delete project
router.delete('/:id', controller.deleteProject);

// Add project member
router.post('/:id/members', controller.addProjectMember);

// Remove project member
router.delete('/:id/members/:userId', controller.removeProjectMember);

export default router; 