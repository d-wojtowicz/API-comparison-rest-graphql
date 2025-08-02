import prisma from '../../db/client.js';
import log from '../../config/logging.js';
import CONFIG from '../../config/config.js';
import { CONSTANTS } from '../../config/constants.js';
import { parsePaginationInput, buildPaginationQuery, createPaginatedResponse } from '../../utils/pagination.js';

const NAMESPACE = CONFIG.server.env === 'PROD' ? 'NOTIFICATION-RESOLVER' : 'graphql/resolvers/notifications.resolvers.js';

// Helper functions
const isNotificationOwner = (user, notification) => user?.userId === notification.user_id;
const isSuperAdmin = (user) => user?.role === 'superadmin';

export const notificationResolvers = {
  Query: {
    myNotifications: async (_, { input }, { user }) => {
      const pagination = parsePaginationInput(input, { defaultLimit: 20, maxLimit: 100 });
      const paginationQuery = buildPaginationQuery(pagination, 'notification_id');
      
      // Build the base where clause
      const baseWhere = { user_id: user.userId };

      // Merge pagination where clause with base where clause
      const finalWhere = paginationQuery.where 
        ? { AND: [baseWhere, paginationQuery.where] }
        : baseWhere;

      const notifications = await prisma.notifications.findMany({
        where: finalWhere,
        orderBy: { created_at: 'desc' },
        take: paginationQuery.take
      });
      
      return createPaginatedResponse(notifications, pagination, 'notification_id');
    },
    myNotificationsList: async (_, __, { user, loaders }) => {
      const myNotifications = await loaders.myNotificationsLoader.load(user.userId);

      return myNotifications;
    },

    unreadNotificationsCount: async (_, __, { user, loaders }) => {
      return prisma.notifications.count({
        where: {
          user_id: user.userId,
          is_read: false
        }
      });
    },

    notification: async (_, { id }, { user, loaders }) => {
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
    createNotification: async (_, { input }, { user, pubsub }) => {
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

      const channel = CONSTANTS.SUBSCRIPTION_CHANNEL({ 
        CHANNEL: CONSTANTS.NOTIFICATIONS.CREATED, 
        USER_ID: notification.user_id 
      });

      // Publish the new notification for real-time updates
      await pubsub.publish(channel, { notificationCreated: notification });

      return notification;
    },

    updateNotification: async (_, { id, input }, { user, loaders, pubsub }) => {
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

      const channel = CONSTANTS.SUBSCRIPTION_CHANNEL({ 
        CHANNEL: CONSTANTS.NOTIFICATIONS.UPDATED, 
        USER_ID: updatedNotification.user_id 
      });

      // Publish the updated notification for real-time updates
      await pubsub.publish(channel, { notificationUpdated: updatedNotification });

      return updatedNotification;
    },

    markAllNotificationsAsRead: async (_, __, { user }) => {
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
      subscribe: (_, __, { user, pubsub }) => {
        if (!user) {
          log.error(NAMESPACE, 'notificationCreated: User not authenticated');
          throw new Error('Not authenticated');
        }
        if (!pubsub) {
          log.error(NAMESPACE, 'notificationCreated: PubSub instance is undefined');
          throw new Error('PubSub instance is not available');
        }

        const channel = CONSTANTS.SUBSCRIPTION_CHANNEL({ 
          CHANNEL: CONSTANTS.NOTIFICATIONS.CREATED, 
          USER_ID: user.userId 
        });

        return pubsub.asyncIterableIterator([channel], {
          filter: (payload) => payload.notificationCreated.user_id === user.userId
        });
      },
      resolve: (payload) => {
        return payload.notificationCreated;
      }
    },
    notificationUpdated: {
      subscribe: (_, __, { user, pubsub }) => {
        if (!user) {
          log.error(NAMESPACE, 'notificationUpdated: User not authenticated');
          throw new Error('Not authenticated');
        }
        if (!pubsub) {
          log.error(NAMESPACE, 'notificationUpdated: PubSub instance is undefined');
          throw new Error('PubSub instance is not available');
        }
        
        const channel = CONSTANTS.SUBSCRIPTION_CHANNEL({ 
          CHANNEL: CONSTANTS.NOTIFICATIONS.UPDATED, 
          USER_ID: user.userId 
        });

        return pubsub.asyncIterableIterator([channel], {
          filter: (payload) => payload.notificationUpdated.user_id === user.userId
        });
      },
      resolve: (payload) => {
        return payload.notificationUpdated;
      }
    }
  },

  Notification: {
    user: (parent, _, { loaders }) => {
      return loaders.userLoader.load(parent.user_id);
    }
  }
}; 