import log from '../../../config/logging.js';
import projectService from '../../services/v1/projects.service.js';
import CONFIG from '../../../config/config.js';
import { CONSTANTS } from '../../../config/constants.js';

const NAMESPACE = CONFIG.server.env === 'PROD' ? 'PROJECT-CONTROLLER' : 'rest/controllers/projects.controller.js';

const getProjectById = async (req, res) => {
  try {
    const project = await projectService.getProjectById(req.params.id, req.user);
    res.status(200).json(project);
  } catch (error) {
    if (error.message === 'Project not found') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === 'Not authorized to access this project') {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: CONSTANTS.STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const getAllProjects = async (req, res) => {
  try {
    const paginatedProjects = await projectService.getAllProjects(req.pagination);
    res.status(200).json(paginatedProjects);
  } catch (error) {
    res.status(500).json({ message: CONSTANTS.STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const getMyProjects = async (req, res) => {
  try {
    const paginatedProjects = await projectService.getMyProjects(req.user, req.pagination);
    res.status(200).json(paginatedProjects);
  } catch (error) {
    res.status(500).json({ message: CONSTANTS.STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const getProjectMembers = async (req, res) => {
  try {
    const members = await projectService.getProjectMembers(req.params.id, req.user);
    res.status(200).json(members);
  } catch (error) {
    if (error.message === 'Project not found') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === 'Not authorized to view project members') {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: CONSTANTS.STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const createProject = async (req, res) => {
  try {
    const project = await projectService.createProject(req.body, req.user);
    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ message: CONSTANTS.STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const updateProject = async (req, res) => {
  try {
    const project = await projectService.updateProject(req.params.id, req.body, req.user);
    res.status(200).json(project);
  } catch (error) {
    if (error.message === 'Project not found') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === 'Not authorized to update this project') {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: CONSTANTS.STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const deleteProject = async (req, res) => {
  try {
    await projectService.deleteProject(req.params.id, req.user);
    res.status(200).json({ message: 'Project deleted successfully' });
  } catch (error) {
    if (error.message === 'Project not found') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === 'Not authorized to delete this project') {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: CONSTANTS.STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const addProjectMember = async (req, res) => {
  try {
    const { userId, role } = req.body;
    const member = await projectService.addProjectMember(req.params.id, userId, role, req.user);
    res.status(201).json(member);
  } catch (error) {
    if (error.message === 'Project not found' || error.message === 'User not found') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === 'Not authorized to add members to this project') {
      return res.status(403).json({ message: error.message });
    }
    if (error.message === 'User is already a member of this project') {
      return res.status(409).json({ message: error.message });
    }
    res.status(500).json({ message: CONSTANTS.STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const removeProjectMember = async (req, res) => {
  try {
    await projectService.removeProjectMember(req.params.id, req.params.userId, req.user);
    res.status(200).json({ message: 'Member removed successfully' });
  } catch (error) {
    if (error.message === 'Project not found') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === 'Not authorized to remove members from this project') {
      return res.status(403).json({ message: error.message });
    }
    if (error.message === 'User is not a member of this project') {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: CONSTANTS.STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

// Dependencies
const getTasksByProject = async (req, res) => {
  try {
    const paginatedTasks = await projectService.getTasksByProject(req.params.projectId, req.user, req.pagination);
    res.status(200).json(paginatedTasks);
  } catch (error) {
    if (error.message === 'Project not found') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === 'Not authorized to view tasks in this project') {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: CONSTANTS.STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

export default {
  getProjectById,
  getAllProjects,
  getMyProjects,
  getProjectMembers,
  createProject,
  updateProject,
  deleteProject,
  addProjectMember,
  removeProjectMember,
  // Dependencies
  getTasksByProject
}; 