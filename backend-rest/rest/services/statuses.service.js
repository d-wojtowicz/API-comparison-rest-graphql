import CONFIG from '../../config/config.js';
import log from '../../config/logging.js';
import prisma from '../../db/client.js';

const NAMESPACE = CONFIG.server.env === 'PROD' ? 'STATUS-SERVICE' : 'rest/services/statuses.service.js';

const getAllStatuses = async () => {
  try {
    return await prisma.task_statuses.findMany();
  } catch (error) {
    log.error(NAMESPACE, `getAllStatuses: ${error.message}`);
    throw error;
  }
};

const createStatus = async (statusData) => {
  try {
    const { status_name } = statusData;
    
    const existingStatus = await prisma.task_statuses.findUnique({
      where: { status_name }
    });

    if (existingStatus) {
      throw new Error('Status with this name already exists');
    }

    return await prisma.task_statuses.create({
      data: { status_name }
    });
  } catch (error) {
    log.error(NAMESPACE, `createStatus: ${error.message}`);
    throw error;
  }
};

const updateStatus = async (id, statusData) => {
  try {
    const { status_name } = statusData;

    const existingStatus = await prisma.task_statuses.findFirst({
      where: {
        status_name,
        NOT: {
          status_id: Number(id)
        }
      }
    });

    if (existingStatus) {
      throw new Error('Status with this name already exists');
    }

    return await prisma.task_statuses.update({
      where: { status_id: Number(id) },
      data: { status_name }
    });
  } catch (error) {
    log.error(NAMESPACE, `updateStatus: ${error.message}`);
    throw error;
  }
};

const deleteStatus = async (id) => {
  try {
    const tasksWithStatus = await prisma.tasks.findMany({
      where: { status_id: Number(id) }
    });

    if (tasksWithStatus.length > 0) {
      throw new Error('Cannot delete status that is being used by tasks');
    }

    await prisma.task_statuses.delete({
      where: { status_id: Number(id) }
    });

    return true;
  } catch (error) {
    log.error(NAMESPACE, `deleteStatus: ${error.message}`);
    throw error;
  }
}; 

export default {
  getAllStatuses,
  createStatus,
  updateStatus,
  deleteStatus
};