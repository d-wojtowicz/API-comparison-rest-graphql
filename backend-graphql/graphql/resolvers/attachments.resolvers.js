import prisma from '../../db/client.js';
import log from '../../config/logging.js';
import CONFIG from '../../config/config.js';
import { CONSTANTS } from '../../config/constants.js';
import { notificationService } from '../../services/notification.service.js';

const NAMESPACE = CONFIG.server.env === 'PROD' ? 'ATTACHMENT-RESOLVER' : 'graphql/resolvers/attachments.resolvers.js';

// Helper functions
const isSuperAdmin = (user) => user?.role === 'superadmin';
const isAdmin = (user) => user?.role === 'admin' || isSuperAdmin(user);
const hasTaskAccess = async (user, taskId) => {
  if (!user) return false;

  const task = await prisma.tasks.findUnique({
    where: { task_id: Number(taskId) },
    include: {
      projects: {
        include: {
          project_members: true
        }
      }
    }
  });

  if (!task) return false;

  // Check if user is project member or task assignee
  return task.assignee_id === user.userId ||
         task.projects.project_members.some(member => member.user_id === user.userId);
};

export const attachmentResolvers = {
  Query: {
    taskAttachment: async (_, { id }, { user }) => {
      if (!user) {
        log.error(NAMESPACE, 'taskAttachment: User not authenticated');
        throw new Error('Not authenticated');
      }

      const attachment = await prisma.task_attachments.findUnique({
        where: { attachment_id: Number(id) },
        include: { tasks: true }
      });

      if (!attachment) {
        log.error(NAMESPACE, 'taskAttachment: Attachment not found');
        throw new Error('Attachment not found');
      }

      if (!await hasTaskAccess(user, attachment.task_id) && !isAdmin(user)) {
        log.error(NAMESPACE, 'taskAttachment: User not authorized to view this attachment');
        throw new Error('Not authorized to view this attachment');
      }

      return attachment;
    },

    taskAttachments: async (_, __, { user }) => {
      if (!user) {
        log.error(NAMESPACE, 'taskAttachments: User not authenticated');
        throw new Error('Not authenticated');
      }

      // For admin/superadmin, return all attachments
      if (isAdmin(user)) {
        const attachments = await prisma.task_attachments.findMany({
          include: { tasks: true }
        });

        if (!attachments) {
          log.error(NAMESPACE, 'taskAttachments: Attachments not found');
          throw new Error('Attachments not found');
        }

        return attachments;
      }
      // For regular users, only return attachments from tasks in their projects
      else {
        const attachments = await prisma.task_attachments.findMany({
          where: {
            tasks: {
              projects: {
                OR: [
                  { owner_id: user.userId },
                  {
                    project_members: {
                      some: { user_id: user.userId }
                    }
                  }
                ]
              }
            }
          },
          include: { tasks: true }
        });

        if (!attachments) {
          log.error(NAMESPACE, 'taskAttachments: Attachments not found');
          throw new Error('Attachments not found');
        }

        return attachments;
      }
    },

    taskAttachmentsByTask: async (_, { taskId }, { user }) => {
      if (!user) {
        log.error(NAMESPACE, 'taskAttachmentsByTask: User not authenticated');
        throw new Error('Not authenticated');
      }

      if (!await hasTaskAccess(user, taskId) && !isAdmin(user)) {
        log.error(NAMESPACE, 'taskAttachmentsByTask: User not authorized to view these attachments');
        throw new Error('Not authorized to view these attachments');
      }

      return prisma.task_attachments.findMany({
        where: { task_id: Number(taskId) },
        include: { tasks: true }
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

      if (!await hasTaskAccess(user, task_id) && !isAdmin(user)) {
        log.error(NAMESPACE, 'createTaskAttachment: User not authorized to add attachments to this task');
        throw new Error('Not authorized to add attachments to this task');
      }

      const attachment = await prisma.task_attachments.create({
        data: {
          task_id: Number(task_id),
          file_path
        },
        include: { tasks: true }
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
        where: { attachment_id: Number(id) },
        include: { tasks: true }
      });

      if (!attachment) {
        log.error(NAMESPACE, 'updateTaskAttachment: Attachment not found');
        throw new Error('Attachment not found');
      }

      if (!await hasTaskAccess(user, attachment.task_id) && !isAdmin(user)) {
        log.error(NAMESPACE, 'updateTaskAttachment: User not authorized to update this attachment');
        throw new Error('Not authorized to update this attachment');
      }

      return prisma.task_attachments.update({
        where: { attachment_id: Number(id) },
        data: {
          file_path: input.file_path,
        },
        include: { tasks: true }
      });
    },

    deleteTaskAttachment: async (_, { id }, { user }) => {
      if (!user) {
        log.error(NAMESPACE, 'deleteTaskAttachment: User not authenticated');
        throw new Error('Not authenticated');
      }

      const attachment = await prisma.task_attachments.findUnique({
        where: { attachment_id: Number(id) },
        include: { tasks: true }
      });

      if (!attachment) {
        log.error(NAMESPACE, 'deleteTaskAttachment: Attachment not found');
        throw new Error('Attachment not found');
      }

      if (!await hasTaskAccess(user, attachment.task_id) && !isAdmin(user)) {
        log.error(NAMESPACE, 'deleteTaskAttachment: User not authorized to delete this attachment');
        throw new Error('Not authorized to delete this attachment');
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