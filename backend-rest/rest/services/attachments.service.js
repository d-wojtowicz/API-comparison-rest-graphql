import CONFIG from '../../config/config.js';
import log from '../../config/logging.js';
import prisma from '../../db/client.js';
import { isAdmin, hasTaskAccess } from '../utils/permissions.js';
import { notificationService } from '../../services/notification.service.js';
import { CONSTANTS } from '../../config/constants.js';

const NAMESPACE = CONFIG.server.env === 'PROD' ? 'ATTACHMENT-SERVICE' : 'rest/services/attachments.service.js';

const getAttachmentById = async (id, user) => {
  try {
    const attachment = await prisma.task_attachments.findUnique({
      where: { attachment_id: Number(id) }
    });

    if (!attachment) {
      log.error(NAMESPACE, `getAttachmentById: Attachment not found`);
      throw new Error('Attachment not found');
    }

    const hasAccess = await hasTaskAccess(user, attachment.task_id);
    if (!hasAccess && !isAdmin(user)) {
      log.error(NAMESPACE, `getAttachmentById: User not authorized to view this attachment`);
      throw new Error('Not authorized to view this attachment');
    }

    return attachment;
  } catch (error) {
    log.error(NAMESPACE, `getAttachmentById: ${error.message}`);
    throw error;
  }
};

const createAttachment = async (attachmentData, user) => {
  try {
    const { task_id, file_path } = attachmentData;

    // Check if task exists and user has access (admin check is handled by middleware)
    const task = await prisma.tasks.findUnique({
      where: { task_id: Number(task_id) }
    });

    if (!task) {
      log.error(NAMESPACE, `createAttachment: Task not found`);
      throw new Error('Task not found');
    }

    const hasAccess = await hasTaskAccess(user, task);
    if (!hasAccess && !isAdmin(user)) {
      log.error(NAMESPACE, `createAttachment: User not authorized to create attachments for this task`);
      throw new Error('Not authorized to create attachments for this task');
    }

    return await prisma.$transaction(async (tx) => {
      const attachment = await tx.task_attachments.create({
        data: {
          task_id: Number(task_id),
          file_path
        }
      });

      const [taskDetails, uploader] = await Promise.all([
        prisma.tasks.findUnique({
          where: { task_id: Number(task_id) }
        }),
        prisma.users.findUnique({
          where: { user_id: user.userId }
        })
      ]);

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
    });
  } catch (error) {
    log.error(NAMESPACE, `createAttachment: ${error.message}`);
    throw error;
  }
};

const updateAttachment = async (id, attachmentData, user) => {
  try {
    const { file_path } = attachmentData;

    const attachment = await prisma.task_attachments.findUnique({
      where: { attachment_id: Number(id) },
    });

    if (!attachment) {
      log.error(NAMESPACE, `updateAttachment: Attachment not found`);
      throw new Error('Attachment not found');
    }

    const hasAccess = await hasTaskAccess(user, attachment.tasks);
    if (!hasAccess && !isAdmin(user)) {
      log.error(NAMESPACE, `updateAttachment: User not authorized to update this attachment`);
      throw new Error('Not authorized to update this attachment');
    }

    return await prisma.task_attachments.update({
      where: { attachment_id: Number(id) },
      data: { file_path }
    });
  } catch (error) {
    log.error(NAMESPACE, `updateAttachment: ${error.message}`);
    throw error;
  }
};

const deleteAttachment = async (id, user) => {
  try {
    const attachment = await prisma.task_attachments.findUnique({
      where: { attachment_id: Number(id) }
    });

    if (!attachment) {
      log.error(NAMESPACE, `deleteAttachment: Attachment not found`);
      throw new Error('Attachment not found');
    }

    // Check if user has access to the task (admin check is handled by middleware)
    const hasAccess = await hasTaskAccess(user, attachment.tasks);
    if (!hasAccess && !isAdmin(user)) {
      log.error(NAMESPACE, `deleteAttachment: User not authorized to delete this attachment`);
      throw new Error('Not authorized to delete this attachment');
    }

    await prisma.task_attachments.delete({
      where: { attachment_id: Number(id) }
    });

    return true;
  } catch (error) {
    log.error(NAMESPACE, `deleteAttachment: ${error.message}`);
    throw error;
  }
};

export default {
  getAttachmentById,
  createAttachment,
  updateAttachment,
  deleteAttachment
}; 