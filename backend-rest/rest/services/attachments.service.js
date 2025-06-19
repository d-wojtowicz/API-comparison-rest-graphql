import CONFIG from '../../config/config.js';
import log from '../../config/logging.js';
import prisma from '../../db/client.js';

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

const getTaskAttachments = async (taskId, userId) => {
  try {
    // Check if user has access to the task's project
    const task = await prisma.tasks.findUnique({
      where: { task_id: Number(taskId) },
      include: {
        projects: true
      }
    });

    if (!task) {
      throw new Error('Task not found');
    }

    const project = task.projects;
    const isOwner = project.owner_id === userId;
    const isMember = await prisma.project_members.findUnique({
      where: {
        project_id_user_id: {
          project_id: project.project_id,
          user_id: userId
        }
      }
    });

    if (!isOwner && !isMember) {
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

const createAttachment = async (attachmentData) => {
  try {
    const { task_id, file_path } = attachmentData;

    // Check if task exists
    const task = await prisma.tasks.findUnique({
      where: { task_id: Number(task_id) }
    });

    if (!task) {
      throw new Error('Task not found');
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

const updateAttachment = async (id, attachmentData) => {
  try {
    const { file_path } = attachmentData;

    const attachment = await prisma.task_attachments.findUnique({
      where: { attachment_id: Number(id) }
    });

    if (!attachment) {
      throw new Error('Attachment not found');
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

const deleteAttachment = async (id) => {
  try {
    const attachment = await prisma.task_attachments.findUnique({
      where: { attachment_id: Number(id) }
    });

    if (!attachment) {
      throw new Error('Attachment not found');
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