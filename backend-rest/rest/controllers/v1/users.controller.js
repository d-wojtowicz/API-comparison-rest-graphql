import log from '../../../config/logging.js';
import userService from '../../services/v1/users.service.js';
import CONFIG from '../../../config/config.js';
import { CONSTANTS } from '../../../config/constants.js';

const NAMESPACE = CONFIG.server.env === 'PROD' ? 'USER-CONTROLLER' : 'rest/controllers/users.controller.js';

const getMe = async (req, res) => {
  try {
    const user = await userService.getMe(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: CONSTANTS.STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await userService.getUserById(req.params.id, req.user);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: CONSTANTS.STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await userService.getAllUsers(req.user);
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: CONSTANTS.STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const register = async (req, res) => {
  try {
    const user = await userService.register(req.body);
    res.status(201).json(user);
  } catch (error) {
    if (error.message === 'User with this email or username already exists') {
      return res.status(409).json({ message: error.message });
    }
    res.status(500).json({ message: CONSTANTS.STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const login = async (req, res) => {
  try {
    const result = await userService.login(req.body);
    res.status(200).json(result);
  } catch (error) {
    if (error.message === 'Invalid credentials') {
      return res.status(401).json({ message: error.message });
    }
    res.status(500).json({ message: CONSTANTS.STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const changePassword = async (req, res) => {
  try {
    await userService.changePassword(req.user.userId, req.body);
    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === 'Invalid current password') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: CONSTANTS.STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const user = await userService.updateUserRole(req.params.id, req.body.role, req.user);
    res.status(200).json(user);
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === 'Cannot modify self' || 
        error.message === 'Cannot modify superadmin users' ||
        error.message === 'Cannot promote to superadmin') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: CONSTANTS.STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const deleteUser = async (req, res) => {
  try {
    await userService.deleteUser(req.params.id, req.user);
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === 'Cannot delete admin users' || 
        error.message === 'Cannot delete self') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: CONSTANTS.STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

// Dependencies
const getTasksByAssignee = async (req, res) => {
  try {
    const tasks = await userService.getTasksByAssignee(req.params.userId, req.user);
    res.status(200).json(tasks);
  } catch (error) {
    if (error.message === 'Not authorized to view these tasks') {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: CONSTANTS.STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

export default {
  getMe,
  getUserById,
  getAllUsers,
  register,
  login,
  changePassword,
  updateUserRole,
  deleteUser,
  // Dependencies
  getTasksByAssignee
}; 