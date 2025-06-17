import log from '../../config/logging.js';
import statusService from '../services/statuses.service.js';
import CONFIG from '../../config/config.js';
import { CONSTANTS } from '../../config/constants.js';

const NAMESPACE = CONFIG.server.env === 'PROD' ? 'STATUS-CONTROLLER' : 'rest/controllers/statuses.controllers.js';

const getAllStatuses = async (req, res) => {
  try {
    const statuses = await statusService.getAllStatuses();
    res.json(statuses);
  } catch (error) {
    res.status(500).json({ message: CONSTANTS.STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const createStatus = async (req, res) => {
  try {
    const status = await statusService.createStatus(req.body);
    res.status(201).json(status);
  } catch (error) {
    if (error.message === 'Status with this name already exists') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: CONSTANTS.STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const updateStatus = async (req, res) => {
  try {
    const status = await statusService.updateStatus(req.params.id, req.body);
    if (!status) {
      return res.status(404).json({ message: 'Status not found' });
    }
    res.json(status);
  } catch (error) {
    if (error.message === 'Status with this name already exists') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: CONSTANTS.STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const deleteStatus = async (req, res) => {
  try {
    await statusService.deleteStatus(req.params.id);
    res.json({ message: 'Status deleted successfully' });
  } catch (error) {
    if (error.message === 'Cannot delete status that is being used by tasks') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: CONSTANTS.STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
}; 

export default {
  getAllStatuses,
  createStatus,
  updateStatus,
  deleteStatus
};