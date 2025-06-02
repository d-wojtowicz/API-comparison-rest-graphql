import prisma from '../../db/client.js';
import log from '../../config/logging.js';
import CONFIG from '../../config/config.js';
import { CONSTANTS } from '../../config/constants.js';
import { notificationService } from '../../services/notification.service.js';

const NAMESPACE = CONFIG.server.env === 'PROD' ? 'ATTACHMENT-RESOLVER' : 'graphql/resolvers/attachments.resolvers.js';

// Helper functions
const isSuperAdmin = (user) => user?.role === 'superadmin';
const isAdmin = (user) => user?.role === 'admin' || isSuperAdmin(user);
const hasTaskAccess = async (user, taskId, loaders) => {
  if (!user) return false;

  const task = await loaders.taskLoader.load(Number(taskId));
  if (!task) return false;

  const [project, projectMembers] = await Promise.all([
    loaders.projectLoader.load(task.project_id),
    loaders.projectMembersByProjectLoader.load(task.project_id)
  ]);

  if (!project) return false;

  return task.assignee_id === user.userId ||
         project.owner_id === user.userId ||
         projectMembers.some(member => member.user_id === user.userId);
};

export const attachmentResolvers = {
  Query: {
    taskAttachment: async (_, { id }, { user, loaders }) => {
      if (!user) {
        log.error(NAMESPACE, 'taskAttachment: User not authenticated');
        throw new Error('Not authenticated');
      }

      const attachment = await loaders.attachmentLoader.load(Number(id));

      if (!attachment) {
        log.error(NAMESPACE, 'taskAttachment: Attachment not found');
        throw new Error('Attachment not found');
      }

      if (!await hasTaskAccess(user, attachment.task_id, loaders) && !isAdmin(user)) {
        log.error(NAMESPACE, 'taskAttachment: User not authorized to view this attachment');
        throw new Error('Not authorized to view this attachment');
      }

      return attachment;
    },
    taskAttachmentsByTask: async (_, { taskId }, { user, loaders }) => {
      if (!user) {
        log.error(NAMESPACE, 'taskAttachmentsByTask: User not authenticated');
        throw new Error('Not authenticated');
      }
      
      const taskAttachments = await loaders.taskAttachmentsLoader.load(Number(taskId)); 

      if (!await hasTaskAccess(user, taskId, loaders) && !isAdmin(user)) {
        log.error(NAMESPACE, 'taskAttachmentsByTask: User not authorized to view these attachments');
        throw new Error('Not authorized to view these attachments');
      }

      return taskAttachments;
    }
  },

  Mutation: {
    createTaskAttachment: async (_, { input }, { user, loaders, pubsub }) => {
      if (!user) {
        log.error(NAMESPACE, 'createTaskAttachment: User not authenticated');
        throw new Error('Not authenticated');
      }

      if (!await hasTaskAccess(user, input.task_id, loaders) && !isAdmin(user)) {
        log.error(NAMESPACE, 'createTaskAttachment: User not authorized to add attachments to this task');
        throw new Error('Not authorized to add attachments to this task');
      }

      return await prisma.$transaction(async (tx) => {
        const attachment = await tx.task_attachments.create({
          data: {
            task_id: Number(input.task_id),
            file_path: input.file_path
          }
        });

        const [taskDetails, uploader] = await Promise.all([
          loaders.taskLoader.load(Number(input.task_id)),
          loaders.userLoader.load(user.userId)
        ]);

        if (taskDetails.assignee_id && taskDetails.assignee_id !== user.userId) {
          await notificationService.createNotification(
            taskDetails.assignee_id,
            CONSTANTS.NOTIFICATIONS.TYPES.TASK.ATTACHMENT_ADDED,
            {
              userName: uploader.username,
              taskName: taskDetails.task_name
            },
            pubsub
          );
        }

        return attachment;
      });
    },

    updateTaskAttachment: async (_, { id, input }, { user, loaders }) => {
      if (!user) {
        log.error(NAMESPACE, 'updateTaskAttachment: User not authenticated');
        throw new Error('Not authenticated');
      }

      const attachment = await loaders.attachmentLoader.load(Number(id));
      if (!attachment) {
        log.error(NAMESPACE, 'updateTaskAttachment: Attachment not found');
        throw new Error('Attachment not found');
      }

      if (!await hasTaskAccess(user, attachment.task_id, loaders) && !isAdmin(user)) {
        log.error(NAMESPACE, 'updateTaskAttachment: User not authorized to update this attachment');
        throw new Error('Not authorized to update this attachment');
      }

      return prisma.task_attachments.update({
        where: { attachment_id: Number(id) },
        data: {
          file_path: input.file_path,
        }
      });
    },

    deleteTaskAttachment: async (_, { id }, { user, loaders }) => {
      if (!user) {
        log.error(NAMESPACE, 'deleteTaskAttachment: User not authenticated');
        throw new Error('Not authenticated');
      }

      const attachment = await loaders.attachmentLoader.load(Number(id));
      if (!attachment) {
        log.error(NAMESPACE, 'deleteTaskAttachment: Attachment not found');
        throw new Error('Attachment not found');
      }

      if (!await hasTaskAccess(user, attachment.task_id, loaders) && !isAdmin(user)) {
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
    task: (parent, _, { loaders }) => {
      return loaders.taskLoader.load(parent.task_id);
    }
  }
}; 