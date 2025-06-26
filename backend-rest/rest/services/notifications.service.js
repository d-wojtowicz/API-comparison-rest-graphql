// TODO: Add subscription-similar mechanism for notifications (like pubsub in graphql)

import CONFIG from '../../config/config.js';
import log from '../../config/logging.js';
import prisma from '../../db/client.js';
import { isNotificationOwner, isSuperAdmin } from '../utils/permissions.js';
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
      log.error(NAMESPACE, `getNotificationById: Notification not found`);
      throw new Error('Notification not found');
    }

    // Users can only view their own notifications
    if (!isNotificationOwner(userId, notification) && !isSuperAdmin(userId)) {
      log.error(NAMESPACE, `getNotificationById: Not authorized to view this notification`);
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
      log.error(NAMESPACE, `createNotification: User not found`);
      throw new Error('User not found');
    }

    const notification = await prisma.notifications.create({
      data: {
        user_id: Number(user_id),
        message,
        is_read: false
      }
    });

    // TODO: Add subscription-similar mechanism for notifications (like pubsub in graphql)

    return notification;
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
      log.error(NAMESPACE, `updateNotification: Notification not found`);
      throw new Error('Notification not found');
    }

    // Users can only update their own notifications
      if (!isNotificationOwner(userId, notification) && !isSuperAdmin(userId)) {
      log.error(NAMESPACE, `updateNotification: Not authorized to update this notification`);
      throw new Error('Not authorized to update this notification');
    }

    const updatedNotification = await prisma.notifications.update({
      where: { notification_id: Number(id) },
      data: { is_read }
    });

    // TODO: Add subscription-similar mechanism for notifications (like pubsub in graphql)

    return updatedNotification;
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
      log.error(NAMESPACE, `deleteNotification: Notification not found`);
      throw new Error('Notification not found');
    }

    // Users can only delete their own notifications
    if (!isNotificationOwner(userId, notification) && !isSuperAdmin(userId)) {
      log.error(NAMESPACE, `deleteNotification: Not authorized to delete this notification`);
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