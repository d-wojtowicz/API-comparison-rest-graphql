import prisma from '../../db/client.js';
import log from '../../config/logging.js';
import CONFIG from '../../config/config.js';
import { CONSTANTS } from '../../config/constants.js';
import { notificationService } from '../../services/notification.service.js';

const NAMESPACE = CONFIG.server.env === 'PROD' ? 'ATTACHMENT-RESOLVER' : 'graphql/resolvers/attachments.resolvers.js';

export const attachmentResolvers = {
  Query: {
    taskAttachment: async (_, { id }) => {
      return prisma.task_attachments.findUnique({
        where: { attachment_id: Number(id) },
        include: {
          tasks: true
        }
      });
    },
    taskAttachments: async () => {
      return prisma.task_attachments.findMany({
        include: {
          tasks: true
        }
      });
    },
    taskAttachmentsByTask: async (_, { taskId }) => {
      return prisma.task_attachments.findMany({
        where: { task_id: Number(taskId) },
        include: {
          tasks: true
        }
      });
    }
  },
  Mutation: {
    createTaskAttachment: async (_, { input }, { user }) => {
      if (!user) {
        log.error(NAMESPACE, 'createTaskAttachment: User not authenticated');
        throw new Error('Not authenticated');
      }

      const { task_id, file_path } = input;

      // Verify that the task exists
      const task = await prisma.tasks.findUnique({
        where: { task_id: Number(task_id) }
      });

      if (!task) {
        log.error(NAMESPACE, 'createTaskAttachment: Task not found');
        throw new Error('Task not found');
      }

      const attachment = await prisma.task_attachments.create({
        data: {
          task_id: Number(task_id),
          file_path
        },
        include: {
          tasks: true
        }
      });

      // Get task and user details for notification
      const [taskDetails, uploader] = await Promise.all([
        prisma.tasks.findUnique({
          where: { task_id: Number(task_id) }
        }),
        prisma.users.findUnique({
          where: { user_id: user.userId }
        })
      ]);

      // Notify task assignee about the new attachment
      if (taskDetails.assignee_id && taskDetails.assignee_id !== user.userId) {
        await notificationService.createNotification(
          taskDetails.assignee_id,
          CONSTANTS.NOTIFICATIONS.TYPES.TASK.ATTACHMENT_ADDED,
          {
            userName: uploader.username,
            taskName: taskDetails.task_name
          }
        );
      }

      return attachment;
    },
    updateTaskAttachment: async (_, { id, input }, { user }) => {
      if (!user) {
        log.error(NAMESPACE, 'updateTaskAttachment: User not authenticated');
        throw new Error('Not authenticated');
      }

      const attachment = await prisma.task_attachments.findUnique({
        where: { attachment_id: Number(id) }
      });

      if (!attachment) {
        log.error(NAMESPACE, 'updateTaskAttachment: Attachment not found');
        throw new Error('Attachment not found');
      }

      const { file_path } = input;

      return prisma.task_attachments.update({
        where: { attachment_id: Number(id) },
        data: {
          file_path,
        },
        include: {
          tasks: true
        }
      });
    },
    deleteTaskAttachment: async (_, { id }, { user }) => {
      if (!user) {
        log.error(NAMESPACE, 'deleteTaskAttachment: User not authenticated');
        throw new Error('Not authenticated');
      }

      const attachment = await prisma.task_attachments.findUnique({
        where: { attachment_id: Number(id) }
      });

      if (!attachment) {
        log.error(NAMESPACE, 'deleteTaskAttachment: Attachment not found');
        throw new Error('Attachment not found');
      }

      await prisma.task_attachments.delete({
        where: { attachment_id: Number(id) }
      });

      return true;
    }
  },
  TaskAttachment: {
    task: (parent) => {
      return prisma.tasks.findUnique({
        where: { task_id: parent.task_id }
      });
    }
  }
}; 