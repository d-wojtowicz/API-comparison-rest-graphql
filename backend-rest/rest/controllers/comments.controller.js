import log from '../../config/logging.js';
import commentService from '../services/comments.service.js';
import CONFIG from '../../config/config.js';
import { CONSTANTS } from '../../config/constants.js';

const NAMESPACE = CONFIG.server.env === 'PROD' ? 'COMMENT-CONTROLLER' : 'rest/controllers/comments.controller.js';

const getCommentById = async (req, res) => {
  try {
    const comment = await commentService.getCommentById(req.params.id);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    res.status(200).json(comment);
  } catch (error) {
    res.status(500).json({ message: CONSTANTS.STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const getTaskComments = async (req, res) => {
  try {
    const comments = await commentService.getTaskComments(req.params.taskId, req.user.userId);
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

const createComment = async (req, res) => {
  try {
    const comment = await commentService.createComment(req.body, req.user.userId);
    res.status(201).json(comment);
  } catch (error) {
    if (error.message === 'Task not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: CONSTANTS.STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const updateComment = async (req, res) => {
  try {
    const comment = await commentService.updateComment(req.params.id, req.body, req.user.userId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    res.status(200).json(comment);
  } catch (error) {
    if (error.message === 'Not authorized to update this comment') {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: CONSTANTS.STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const deleteComment = async (req, res) => {
  try {
    await commentService.deleteComment(req.params.id, req.user.userId);
    res.status(200).json({ message: 'Comment deleted successfully' });
  } catch (error) {
    if (error.message === 'Comment not found') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === 'Not authorized to delete this comment') {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: CONSTANTS.STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

export default {
  getCommentById,
  getTaskComments,
  createComment,
  updateComment,
  deleteComment
}; 