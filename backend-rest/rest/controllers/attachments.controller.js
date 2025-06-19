import log from '../../config/logging.js';
import attachmentService from '../services/attachments.service.js';
import CONFIG from '../../config/config.js';
import { CONSTANTS } from '../../config/constants.js';

const NAMESPACE = CONFIG.server.env === 'PROD' ? 'ATTACHMENT-CONTROLLER' : 'rest/controllers/attachments.controller.js';

const getAttachmentById = async (req, res) => {
  try {
    const attachment = await attachmentService.getAttachmentById(req.params.id);
    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }
    res.status(200).json(attachment);
  } catch (error) {
    res.status(500).json({ message: CONSTANTS.STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const getTaskAttachments = async (req, res) => {
  try {
    const attachments = await attachmentService.getTaskAttachments(req.params.taskId, req.user.userId);
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

const createAttachment = async (req, res) => {
  try {
    const attachment = await attachmentService.createAttachment(req.body);
    res.status(201).json(attachment);
  } catch (error) {
    if (error.message === 'Task not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: CONSTANTS.STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const updateAttachment = async (req, res) => {
  try {
    const attachment = await attachmentService.updateAttachment(req.params.id, req.body);
    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }
    res.status(200).json(attachment);
  } catch (error) {
    res.status(500).json({ message: CONSTANTS.STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const deleteAttachment = async (req, res) => {
  try {
    await attachmentService.deleteAttachment(req.params.id);
    res.status(200).json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    if (error.message === 'Attachment not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: CONSTANTS.STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

export default {
  getAttachmentById,
  getTaskAttachments,
  createAttachment,
  updateAttachment,
  deleteAttachment
}; 