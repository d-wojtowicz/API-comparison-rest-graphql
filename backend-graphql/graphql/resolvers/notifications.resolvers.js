import prisma from '../../db/client.js';
import log from '../../config/logging.js';
import CONFIG from '../../config/config.js';
import { PubSub } from 'graphql-subscriptions';
import { CONSTANTS } from '../../config/constants.js';

const NAMESPACE = CONFIG.server.env === 'PROD' ? 'NOTIFICATION-RESOLVER' : 'graphql/resolvers/notifications.resolvers.js';

// Helper functions
const isNotificationOwner = (user, notification) => user?.userId === notification.user_id;
const isSuperAdmin = (user) => user?.role === 'superadmin';

// Create PubSub instance for real-time notifications
const pubsub = new PubSub();

export const notificationResolvers = {
  Query: {
    myNotifications: async (_, __, { user, loaders }) => {
      if (!user) {
        log.error(NAMESPACE, 'myNotifications: User not authenticated');
        throw new Error('Not authenticated');
      }

      const myNotifications = await loaders.myNotificationsLoader.load(user.userId);

      return myNotifications;
    },

    unreadNotificationsCount: async (_, __, { user, loaders }) => {
      if (!user) {
        log.error(NAMESPACE, 'unreadNotificationsCount: User not authenticated');
        throw new Error('Not authenticated');
      }

      return prisma.notifications.count({
        where: {
          user_id: user.userId,
          is_read: false
        }
      });
    },

    notification: async (_, { id }, { user, loaders }) => {
      if (!user) {
        log.error(NAMESPACE, 'notification: User not authenticated');
        throw new Error('Not authenticated');
      }

      const notification = await loaders.notificationLoader.load(Number(id));

      if (!notification) {
        log.error(NAMESPACE, 'notification: Notification not found');
        throw new Error('Notification not found');
      }

      // Users can only view their own notifications
      if (!isNotificationOwner(user, notification) && !isSuperAdmin(user)) {
        log.error(NAMESPACE, 'notification: User not authorized to view this notification');
        throw new Error('Not authorized to view this notification');
      }

      return notification;
    }
  },

  Mutation: {
    createNotification: async (_, { input }, { user }) => {
      if (!user) {
        log.error(NAMESPACE, 'createNotification: User not authenticated');
        throw new Error('Not authenticated');
      }

      if (!isSuperAdmin(user)) {
        log.error(NAMESPACE, 'createNotification: User not authorized to create notifications');
        throw new Error('Not authorized to create notifications');
      }

      const notification = await prisma.notifications.create({
        data: {
          user_id: Number(input.user_id),
          message: input.message,
          is_read: false
        }
      });

      // Publish the new notification for real-time updates
      pubsub.publish(CONSTANTS.NOTIFICATIONS.CREATED, { notificationCreated: notification });

      return notification;
    },

    updateNotification: async (_, { id, input }, { user, loaders }) => {
      if (!user) {
        log.error(NAMESPACE, 'updateNotification: User not authenticated');
        throw new Error('Not authenticated');
      }

      const notification = await loaders.notificationLoader.load(Number(id));

      if (!notification) {
        log.error(NAMESPACE, 'updateNotification: Notification not found');
        throw new Error('Notification not found');
      }

      // Users can only update their own notifications
      if (!isNotificationOwner(user, notification) && !isSuperAdmin(user)) {
        log.error(NAMESPACE, 'updateNotification: User not authorized to update this notification');
        throw new Error('Not authorized to update this notification');
      }

      const updatedNotification = await prisma.notifications.update({
        where: { notification_id: Number(id) },
        data: {
          is_read: input.is_read
        }
      });

      // Publish the updated notification for real-time updates
      pubsub.publish(CONSTANTS.NOTIFICATIONS.UPDATED, { notificationUpdated: updatedNotification });

      return updatedNotification;
    },

    markAllNotificationsAsRead: async (_, __, { user }) => {
      if (!user) {
        log.error(NAMESPACE, 'markAllNotificationsAsRead: User not authenticated');
        throw new Error('Not authenticated');
      }

      await prisma.notifications.updateMany({
        where: {
          user_id: user.userId,
          is_read: false
        },
        data: {
          is_read: true
        }
      });

      return true;
    },

    deleteNotification: async (_, { id }, { user, loaders }) => {
      if (!user) {
        log.error(NAMESPACE, 'deleteNotification: User not authenticated');
        throw new Error('Not authenticated');
      }

      const notification = await loaders.notificationLoader.load(Number(id));

      if (!notification) {
        log.error(NAMESPACE, 'deleteNotification: Notification not found');
        throw new Error('Notification not found');
      }

      // Users can only delete their own notifications
      if (!isNotificationOwner(user, notification) && !isSuperAdmin(user)) {
        log.error(NAMESPACE, 'deleteNotification: User not authorized to delete this notification');
        throw new Error('Not authorized to delete this notification');
      }

      await prisma.notifications.delete({
        where: { notification_id: Number(id) }
      });

      return true;
    }
  },

  Subscription: {
    notificationCreated: {
      subscribe: (_, __, { user }) => {
        if (!user) {
          log.error(NAMESPACE, 'notificationCreated: User not authenticated');
          throw new Error('Not authenticated');
        }
        return pubsub.asyncIterator([CONSTANTS.NOTIFICATIONS.CREATED]);
      }
    },
    notificationUpdated: {
      subscribe: (_, __, { user }) => {
        if (!user) {
          log.error(NAMESPACE, 'notificationUpdated: User not authenticated');
          throw new Error('Not authenticated');
        }
        return pubsub.asyncIterator([CONSTANTS.NOTIFICATIONS.UPDATED]);
      }
    }
  },

  Notification: {
    user: (parent, _, { loaders }) => {
      return loaders.userLoader.load(parent.user_id);
    }
  }
}; 