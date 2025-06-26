import log from '../../config/logging.js';
import taskService from '../services/tasks.service.js';
import CONFIG from '../../config/config.js';
import { CONSTANTS } from '../../config/constants.js';

const NAMESPACE = CONFIG.server.env === 'PROD' ? 'TASK-CONTROLLER' : 'rest/controllers/tasks.controller.js';

const getTaskById = async (req, res) => {
  try {
    const task = await taskService.getTaskById(req.params.id, req.user);
    res.status(200).json(task);
  } catch (error) {
    if (error.message === 'Task not found') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === 'Project not found') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === 'Not authorized to view this task') {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: CONSTANTS.STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const createTask = async (req, res) => {
  try {
    const task = await taskService.createTask(req.body, req.user);
    res.status(201).json(task);
  } catch (error) {
    if (error.message === 'Project not found') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === 'Not authorized to create tasks in this project') {
      return res.status(403).json({ message: error.message });
    }
    if (error.message === 'Assignee must be a member of the project') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: CONSTANTS.STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const updateTask = async (req, res) => {
  try {
    const task = await taskService.updateTask(req.params.id, req.body, req.user);
    res.status(200).json(task);
  } catch (error) {
    if (error.message === 'Task not found') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === 'Project not found') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === 'Not authorized to update this task') {
      return res.status(403).json({ message: error.message });
    }
    if (error.message === 'Assignee must be a member of the project') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: CONSTANTS.STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const deleteTask = async (req, res) => {
  try {
    await taskService.deleteTask(req.params.id, req.user);
    res.status(200).json({ message: 'Task deleted successfully' });
  } catch (error) {
    if (error.message === 'Task not found') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === 'Project not found') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === 'Not authorized to delete this task') {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: CONSTANTS.STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const assignTask = async (req, res) => {
  try {
    const task = await taskService.assignTask(req.params.id, req.body.assigneeId, req.user);
    res.status(200).json(task);
  } catch (error) {
    if (error.message === 'Task not found') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === 'Project not found') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === 'Not authorized to assign this task') {
      return res.status(403).json({ message: error.message });
    }
    if (error.message === 'Assignee must be a member of the project') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: CONSTANTS.STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const updateTaskStatus = async (req, res) => {
  try {
    const task = await taskService.updateTaskStatus(req.params.id, req.body.statusId, req.user);
    res.status(200).json(task);
  } catch (error) {
    if (error.message === 'Task not found') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === 'Project not found') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === 'Status not found') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === 'Not authorized to update this task status') {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: CONSTANTS.STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

// Dependencies
const getTaskComments = async (req, res) => {
  try {
    const comments = await taskService.getTaskComments(req.params.taskId, req.user);
    res.status(200).json(comments);
  } catch (error) {
    if (error.message === 'Task not found') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === 'Not authorized to view comments for this task') {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: CONSTANTS.STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const getTaskAttachments = async (req, res) => {
  try {
    const attachments = await taskService.getTaskAttachments(req.params.taskId, req.user);
    res.status(200).json(attachments);
  } catch (error) {
    if (error.message === 'Task not found') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === 'Not authorized to view attachments for this task') {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: CONSTANTS.STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

export default {
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  assignTask,
  updateTaskStatus,
  // Dependencies
  getTaskComments,
  getTaskAttachments
}; 