import CONFIG from '../../config/config.js';
import log from '../../config/logging.js';
import prisma from '../../db/client.js';
import { hasTaskAccess } from '../utils/permissions.js';

const NAMESPACE = CONFIG.server.env === 'PROD' ? 'ATTACHMENT-SERVICE' : 'rest/services/attachments.service.js';

const getAttachmentById = async (id) => {
  try {
    return await prisma.task_attachments.findUnique({
      where: { attachment_id: Number(id) }
    });
  } catch (error) {
    log.error(NAMESPACE, `getAttachmentById: ${error.message}`);
    throw error;
  }
};

const getTaskAttachments = async (taskId, user) => {
  try {
    // Check if user has access to the task (admin check is handled by middleware)
    const task = await prisma.tasks.findUnique({
      where: { task_id: Number(taskId) }
    });

    if (!task) {
      throw new Error('Task not found');
    }

    const hasAccess = await hasTaskAccess(user, task);
    if (!hasAccess) {
      throw new Error('Not authorized to view attachments for this task');
    }

    return await prisma.task_attachments.findMany({
      where: { task_id: Number(taskId) },
      orderBy: { uploaded_at: 'desc' }
    });
  } catch (error) {
    log.error(NAMESPACE, `getTaskAttachments: ${error.message}`);
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
      throw new Error('Task not found');
    }

    const hasAccess = await hasTaskAccess(user, task);
    if (!hasAccess) {
      throw new Error('Not authorized to create attachments for this task');
    }

    return await prisma.task_attachments.create({
      data: {
        task_id: Number(task_id),
        file_path
      }
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
      include: {
        tasks: true
      }
    });

    if (!attachment) {
      throw new Error('Attachment not found');
    }

    // Check if user has access to the task (admin check is handled by middleware)
    const hasAccess = await hasTaskAccess(user, attachment.tasks);
    if (!hasAccess) {
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
      where: { attachment_id: Number(id) },
      include: {
        tasks: true
      }
    });

    if (!attachment) {
      throw new Error('Attachment not found');
    }

    // Check if user has access to the task (admin check is handled by middleware)
    const hasAccess = await hasTaskAccess(user, attachment.tasks);
    if (!hasAccess) {
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
  getTaskAttachments,
  createAttachment,
  updateAttachment,
  deleteAttachment
}; 