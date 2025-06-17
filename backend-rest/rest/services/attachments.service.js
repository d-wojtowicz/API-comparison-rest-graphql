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
  createAttachment,
  updateAttachment,
  deleteAttachment
}; 