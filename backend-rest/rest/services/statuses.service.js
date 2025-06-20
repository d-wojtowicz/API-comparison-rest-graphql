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

// Dependencies
const getTasksByStatus = async (statusId, userId) => {
  try {
    const tasks = await prisma.tasks.findMany({
      where: { status_id: Number(statusId) }
    });

    if (!tasks.length) return [];

    // For regular users, filter tasks based on project access (admin check is handled by middleware)
    const projectIds = [...new Set(tasks.map(task => task.project_id))];
    
    const accessibleProjectIds = new Set();
    
    for (const projectId of projectIds) {
      const isOwner = await isProjectOwner(userId, projectId);
      const isMember = await isProjectMember(userId, projectId);

      if (isOwner || isMember) {
        accessibleProjectIds.add(projectId);
      }
    }

    // Return only tasks from accessible projects
    return tasks.filter(task => accessibleProjectIds.has(task.project_id));
  } catch (error) {
    log.error(NAMESPACE, `getTasksByStatus: ${error.message}`);
    throw error;
  }
};

export default {
  getAllStatuses,
  createStatus,
  updateStatus,
  deleteStatus,
  // Dependencies
  getTasksByStatus
};