// TODO: Add subscription-similar mechanism for notifications (like pubsub in graphql)

import CONFIG from '../../config/config.js';
import log from '../../config/logging.js';
import prisma from '../../db/client.js';

const NAMESPACE = CONFIG.server.env === 'PROD' ? 'NOTIFICATION-SERVICE' : 'rest/services/notifications.service.js';

const getMyNotifications = async (userId) => {
  try {
    return await prisma.notifications.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' }
    });
  } catch (error) {
    log.error(NAMESPACE, `getMyNotifications: ${error.message}`);
    throw error;
  }
};

const getUnreadNotificationsCount = async (userId) => {
  try {
    return await prisma.notifications.count({
      where: {
        user_id: userId,
        is_read: false
      }
    });
  } catch (error) {
    log.error(NAMESPACE, `getUnreadNotificationsCount: ${error.message}`);
    throw error;
  }
};

const getNotificationById = async (id, userId) => {
  try {
    const notification = await prisma.notifications.findUnique({
      where: { notification_id: Number(id) }
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    // Users can only view their own notifications
    if (notification.user_id !== userId) {
      throw new Error('Not authorized to view this notification');
    }

    return notification;
  } catch (error) {
    log.error(NAMESPACE, `getNotificationById: ${error.message}`);
    throw error;
  }
};

const createNotification = async (notificationData) => {
  try {
    const { user_id, message } = notificationData;

    // Check if user exists
    const user = await prisma.users.findUnique({
      where: { user_id: Number(user_id) }
    });

    if (!user) {
      throw new Error('User not found');
    }

    return await prisma.notifications.create({
      data: {
        user_id: Number(user_id),
        message,
        is_read: false
      }
    });
  } catch (error) {
    log.error(NAMESPACE, `createNotification: ${error.message}`);
    throw error;
  }
};

const updateNotification = async (id, notificationData, userId) => {
  try {
    const { is_read } = notificationData;

    const notification = await prisma.notifications.findUnique({
      where: { notification_id: Number(id) }
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    // Users can only update their own notifications
    if (notification.user_id !== userId) {
      throw new Error('Not authorized to update this notification');
    }

    return await prisma.notifications.update({
      where: { notification_id: Number(id) },
      data: { is_read }
    });
  } catch (error) {
    log.error(NAMESPACE, `updateNotification: ${error.message}`);
    throw error;
  }
};

const markAllNotificationsAsRead = async (userId) => {
  try {
    await prisma.notifications.updateMany({
      where: {
        user_id: userId,
        is_read: false
      },
      data: {
        is_read: true
      }
    });

    return true;
  } catch (error) {
    log.error(NAMESPACE, `markAllNotificationsAsRead: ${error.message}`);
    throw error;
  }
};

const deleteNotification = async (id, userId) => {
  try {
    const notification = await prisma.notifications.findUnique({
      where: { notification_id: Number(id) }
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    // Users can only delete their own notifications
    if (notification.user_id !== userId) {
      throw new Error('Not authorized to delete this notification');
    }

    await prisma.notifications.delete({
      where: { notification_id: Number(id) }
    });

    return true;
  } catch (error) {
    log.error(NAMESPACE, `deleteNotification: ${error.message}`);
    throw error;
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