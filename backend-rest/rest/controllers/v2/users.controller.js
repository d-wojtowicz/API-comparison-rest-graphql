import log from '../../../config/logging.js';
import userService from '../../services/v2/users.service.js';
import userController from '../../controllers/v1/users.controller.js';
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
    const paginatedUsers = await userService.getAllUsers(req.user, req.pagination);
    res.status(200).json(paginatedUsers);
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

export default {
  ...userController,
  getMe,
  getUserById,
  getAllUsers,
  register,
  login,
  updateUserRole,
}; 