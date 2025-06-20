import CONFIG from '../../config/config.js';
import log from '../../config/logging.js';
import prisma from '../../db/client.js';
import { isProjectOwner, isProjectMember, hasTaskAccess, isSelf } from '../utils/permissions.js';

const NAMESPACE = CONFIG.server.env === 'PROD' ? 'TASK-SERVICE' : 'rest/services/tasks.service.js';

const getTaskById = async (id, userId) => {
  try {
    const task = await prisma.tasks.findUnique({
      where: { task_id: Number(id) }
    });

    if (!task) {
      log.error(NAMESPACE, `getTaskById: Task not found`);
      throw new Error('Task not found');
    }

    // Check if user has access to the task (admin check is handled by middleware)
    const hasAccess = await hasTaskAccess({ userId }, task);
    const isAdmin = await isAdmin(userId);
    if (!hasAccess && !isAdmin) {
      log.error(NAMESPACE, `getTaskById: User not authorized to view this task`);
      throw new Error('Not authorized to view this task');
    }

    return task;
  } catch (error) {
    log.error(NAMESPACE, `getTaskById: ${error.message}`);
    throw error;
  }
};

const createTask = async (taskData, userId) => {
  try {
    const { project_id, status_id, assignee_id, ...otherFields } = taskData;

    // Check if user has access to the project (admin check is handled by middleware)
    const isOwner = await isProjectOwner(userId, Number(project_id));
    const isMember = await isProjectMember(userId, Number(project_id));
    const isAdmin = await isAdmin(userId);

    if (!isOwner && !isMember && !isAdmin) {
      log.error(NAMESPACE, `createTask: User not authorized to create tasks in this project`);
      throw new Error('Not authorized to create tasks in this project');
    }

    // If assignee is specified, verify they are a project member
    if (assignee_id) {
      const isAssigneeMember = await isProjectMember(Number(assignee_id), Number(project_id));
      const isAssigneeOwner = await isProjectOwner(Number(assignee_id), Number(project_id));
      const isAdmin = await isAdmin(userId);
      if (!isAssigneeMember && !isAssigneeOwner && !isAdmin) {
        log.error(NAMESPACE, `createTask: Assignee must be a member of the project`);
        throw new Error('Assignee must be a member of the project');
      }
    }

    return await prisma.tasks.create({
      data: {
        ...otherFields,
        project_id: Number(project_id),
        status_id: Number(status_id),
        assignee_id: assignee_id ? Number(assignee_id) : null,
        due_date: otherFields.due_date ? new Date(otherFields.due_date) : null
      }
    });
  } catch (error) {
    log.error(NAMESPACE, `createTask: ${error.message}`);
    throw error;
  }
};

const updateTask = async (id, taskData, userId) => {
  try {
    const task = await prisma.tasks.findUnique({
      where: { task_id: Number(id) }
    });

    if (!task) {
      log.error(NAMESPACE, `updateTask: Task not found`);
      throw new Error('Task not found');
    }

    // Check if user has access to the task (admin check is handled by middleware)
    const hasAccess = await hasTaskAccess({ userId }, task);
    const isAdmin = await isAdmin(userId);
    if (!hasAccess && !isAdmin) {
      log.error(NAMESPACE, `updateTask: User not authorized to update this task`);
      throw new Error('Not authorized to update this task');
    }

    const { project_id, status_id, assignee_id, ...otherFields } = taskData;

    // If assignee is specified, verify they are a project member
    if (assignee_id) {
      const projectId = project_id || task.project_id;
      const isAssigneeMember = await isProjectMember(Number(assignee_id), Number(projectId));
      if (!isAssigneeMember) {
        log.error(NAMESPACE, `updateTask: Assignee must be a member of the project`);
        throw new Error('Assignee must be a member of the project');
      }
    }

    return await prisma.tasks.update({
      where: { task_id: Number(id) },
      data: {
        ...otherFields,
        project_id: project_id ? Number(project_id) : undefined,
        status_id: status_id ? Number(status_id) : undefined,
        assignee_id: assignee_id ? Number(assignee_id) : null,
        due_date: otherFields.due_date ? new Date(otherFields.due_date) : undefined,
        updated_at: new Date()
      }
    });
  } catch (error) {
    log.error(NAMESPACE, `updateTask: ${error.message}`);
    throw error;
  }
};

const deleteTask = async (id, userId) => {
  try {
    const task = await prisma.tasks.findUnique({
      where: { task_id: Number(id) }
    });

    if (!task) {
      log.error(NAMESPACE, `deleteTask: Task not found`);
      throw new Error('Task not found');
    }

    // Check if user has access to the task (admin check is handled by middleware)
    const isOwner = await isProjectOwner(userId, task.project_id);
    const isAdmin = await isAdmin(userId);
    if (!isOwner && !isAdmin) {
      log.error(NAMESPACE, `deleteTask: User not authorized to delete this task`);
      throw new Error('Not authorized to delete this task');
    }

    await prisma.tasks.delete({
      where: { task_id: Number(id) }
    });

    return true;
  } catch (error) {
    log.error(NAMESPACE, `deleteTask: ${error.message}`);
    throw error;
  }
};

const assignTask = async (id, assigneeId, userId) => {
  try {
    const task = await prisma.tasks.findUnique({
      where: { task_id: Number(id) }
    });

    if (!task) {
      log.error(NAMESPACE, `assignTask: Task not found`);
      throw new Error('Task not found');
    }

    // Check if user has access to the project
    const hasAccess = await hasTaskAccess({ userId }, task);
    const isAdmin = await isAdmin(userId);

    if (!hasAccess && !isAdmin) {
      log.error(NAMESPACE, `assignTask: User not authorized to assign this task`);
      throw new Error('Not authorized to assign this task');
    }

    // Check if assignee is a member of the project
    if (assigneeId) {
      const isAssigneeMember = await isProjectMember(Number(assigneeId), Number(task.project_id));
      if (!isAssigneeMember) {
        log.error(NAMESPACE, `assignTask: Assignee must be a member of the project`);
        throw new Error('Assignee must be a member of the project');
      }
    }

    return await prisma.tasks.update({
      where: { task_id: Number(id) },
      data: {
        assignee_id: assigneeId ? Number(assigneeId) : null,
        updated_at: new Date()
      }
    });
  } catch (error) {
    log.error(NAMESPACE, `assignTask: ${error.message}`);
    throw error;
  }
};

const updateTaskStatus = async (id, statusId, userId) => {
  try {
    const task = await prisma.tasks.findUnique({
      where: { task_id: Number(id) }
    });

    if (!task) {
      log.error(NAMESPACE, `updateTaskStatus: Task not found`);
      throw new Error('Task not found');
    }

    // Check if user has access to the project
    const hasAccess = await hasTaskAccess({ userId }, task);
    const isAdmin = await isAdmin(userId);
    if (!hasAccess && !isAdmin) {
      log.error(NAMESPACE, `updateTaskStatus: User not authorized to update this task status`);
      throw new Error('Not authorized to update this task status');
    }

    // Check if status exists
    const status = await prisma.task_statuses.findUnique({
      where: { status_id: Number(statusId) }
    });

    if (!status) {
      log.error(NAMESPACE, `updateTaskStatus: Status not found`);
      throw new Error('Status not found');
    }

    return await prisma.tasks.update({
      where: { task_id: Number(id) },
      data: {
        status_id: Number(statusId),
        updated_at: new Date()
      }
    });
  } catch (error) {
    log.error(NAMESPACE, `updateTaskStatus: ${error.message}`);
    throw error;
  }
};

// Dependencies
const getTaskComments = async (taskId, userId) => {
  try {
    // Check if user has access to the task (admin check is handled by middleware)
    const task = await prisma.tasks.findUnique({
      where: { task_id: Number(taskId) }
    });

    if (!task) {
      throw new Error('Task not found');
    }

    const hasAccess = await hasTaskAccess({ userId }, task);
    if (!hasAccess) {
      throw new Error('Not authorized to view comments for this task');
    }

    return await prisma.task_comments.findMany({
      where: { task_id: Number(taskId) },
      include: {
        users: {
          select: {
            user_id: true,
            username: true,
            email: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });
  } catch (error) {
    log.error(NAMESPACE, `getTaskComments: ${error.message}`);
    throw error;
  }
};

export default {
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  assignTask,
  updateTaskStatus,
  // Dependencies
  getTaskComments
}; 