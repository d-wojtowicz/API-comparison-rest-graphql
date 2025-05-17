import prisma from '../db/client.js';
import { CONSTANTS } from '../config/constants.js';
import { PubSub } from 'graphql-subscriptions';

const pubsub = new PubSub();

export const notificationService = {
  // Format notification message by replacing placeholders with actual values
  formatMessage: (template, values) => {
    let message = template;
    for (const [key, value] of Object.entries(values)) {
      message = message.replace(`{${key}}`, value);
    }
    return message;
  },

  // Create a notification and publish it through PubSub
  createNotification: async (userId, type, messageValues) => {
    let template;
    
    // Get the correct message template based on notification type
    if (type.startsWith('PROJECT_')) {
      template = CONSTANTS.NOTIFICATIONS.MESSAGES.PROJECT[type.replace('PROJECT_', '')];
    } else if (type.startsWith('TASK_')) {
      template = CONSTANTS.NOTIFICATIONS.MESSAGES.TASK[type.replace('TASK_', '')];
    }

    if (!template) {
      log.error(NAMESPACE, 'createNotification: Invalid notification type');
      throw new Error('Invalid notification type');
    }

    const message = notificationService.formatMessage(template, messageValues);

    const notification = await prisma.notifications.create({
      data: {
        user_id: Number(userId),
        message,
        is_read: false
      }
    });

    pubsub.publish(CONSTANTS.NOTIFICATIONS.CREATED, { notificationCreated: notification });

    return notification;
  },

  // Create notifications for multiple users
  createNotifications: async (userIds, type, messageValues) => {
    return Promise.all(
      userIds.map(userId => notificationService.createNotification(userId, type, messageValues))
    );
  },

  // Create notifications for all project members
  notifyProjectMembers: async (projectId, type, messageValues, excludeUserIds = []) => {
    const members = await prisma.project_members.findMany({
      where: { 
        project_id: Number(projectId),
        user_id: { notIn: excludeUserIds }
      },
      select: { user_id: true }
    });

    return notificationService.createNotifications(
      members.map(m => m.user_id),
      type,
      messageValues
    );
  },

  // Create notification for task assignee
  notifyTaskAssignee: async (taskId, type, messageValues) => {
    const task = await prisma.tasks.findUnique({
      where: { task_id: Number(taskId) },
      select: { assignee_id: true }
    });

    if (task?.assignee_id) {
      return notificationService.createNotification(task.assignee_id, type, messageValues);
    }
  }
}; 