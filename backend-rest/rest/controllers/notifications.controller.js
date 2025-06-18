import log from '../../config/logging.js';
import notificationService from '../services/notifications.service.js';
import CONFIG from '../../config/config.js';
import { CONSTANTS } from '../../config/constants.js';

const NAMESPACE = CONFIG.server.env === 'PROD' ? 'NOTIFICATION-CONTROLLER' : 'rest/controllers/notifications.controller.js';

const getMyNotifications = async (req, res) => {
  try {
    const notifications = await notificationService.getMyNotifications(req.user.userId);
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: CONSTANTS.STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const getUnreadNotificationsCount = async (req, res) => {
  try {
    const count = await notificationService.getUnreadNotificationsCount(req.user.userId);
    res.status(200).json({ count });
  } catch (error) {
    res.status(500).json({ message: CONSTANTS.STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const getNotificationById = async (req, res) => {
  try {
    const notification = await notificationService.getNotificationById(req.params.id, req.user.userId);
    res.status(200).json(notification);
  } catch (error) {
    if (error.message === 'Notification not found') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === 'Not authorized to view this notification') {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: CONSTANTS.STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const createNotification = async (req, res) => {
  try {
    const notification = await notificationService.createNotification(req.body);
    res.status(201).json(notification);
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: CONSTANTS.STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const updateNotification = async (req, res) => {
  try {
    const notification = await notificationService.updateNotification(req.params.id, req.body, req.user.userId);
    res.status(200).json(notification);
  } catch (error) {
    if (error.message === 'Notification not found') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === 'Not authorized to update this notification') {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: CONSTANTS.STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const markAllNotificationsAsRead = async (req, res) => {
  try {
    await notificationService.markAllNotificationsAsRead(req.user.userId);
    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: CONSTANTS.STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const deleteNotification = async (req, res) => {
  try {
    await notificationService.deleteNotification(req.params.id, req.user.userId);
    res.status(200).json({ message: 'Notification deleted successfully' });
  } catch (error) {
    if (error.message === 'Notification not found') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === 'Not authorized to delete this notification') {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: CONSTANTS.STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

export default {
  getMyNotifications,
  getUnreadNotificationsCount,
  getNotificationById,
  createNotification,
  updateNotification,
  markAllNotificationsAsRead,
  deleteNotification
}; 