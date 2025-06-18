import CONFIG from '../../config/config.js';
import log from '../../config/logging.js';
import prisma from '../../db/client.js';

const NAMESPACE = CONFIG.server.env === 'PROD' ? 'TASK-SERVICE' : 'rest/services/tasks.service.js';

const getTaskById = async (id, userId) => {
  try {
    const task = await prisma.tasks.findUnique({
      where: { task_id: Number(id) }
    });

    if (!task) {
      throw new Error('Task not found');
    }

    // Check if user has access to the project
    const project = await prisma.projects.findUnique({
      where: { project_id: task.project_id }
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Check if user is project owner, member, or admin
    const isOwner = project.owner_id === userId;
    const isMember = await prisma.project_members.findUnique({
      where: {
        project_id_user_id: {
          project_id: task.project_id,
          user_id: userId
        }
      }
    });

    if (!isOwner && !isMember) {
      throw new Error('Not authorized to view this task');
    }

    return task;
  } catch (error) {
    log.error(NAMESPACE, `getTaskById: ${error.message}`);
    throw error;
  }
};

const getTasksByProject = async (projectId, userId) => {
  try {
    // Check if user has access to the project
    const project = await prisma.projects.findUnique({
      where: { project_id: Number(projectId) }
    });

    if (!project) {
      throw new Error('Project not found');
    }

    const isOwner = project.owner_id === userId;
    const isMember = await prisma.project_members.findUnique({
      where: {
        project_id_user_id: {
          project_id: Number(projectId),
          user_id: userId
        }
      }
    });

    if (!isOwner && !isMember) {
      throw new Error('Not authorized to view tasks in this project');
    }

    return await prisma.tasks.findMany({
      where: { project_id: Number(projectId) }
    });
  } catch (error) {
    log.error(NAMESPACE, `getTasksByProject: ${error.message}`);
    throw error;
  }
};

const getTasksByAssignee = async (assigneeId, userId) => {
  try {
    // Users can only view their own assigned tasks unless they're admin
    if (Number(assigneeId) !== userId) {
      throw new Error('Not authorized to view these tasks');
    }

    return await prisma.tasks.findMany({
      where: { assignee_id: Number(assigneeId) }
    });
  } catch (error) {
    log.error(NAMESPACE, `getTasksByAssignee: ${error.message}`);
    throw error;
  }
};

const getTasksByStatus = async (statusId, userId) => {
  try {
    const tasks = await prisma.tasks.findMany({
      where: { status_id: Number(statusId) }
    });

    if (!tasks.length) return [];

    // For regular users, filter tasks based on project access
    const projectIds = [...new Set(tasks.map(task => task.project_id))];
    
    const accessibleProjectIds = new Set();
    
    for (const projectId of projectIds) {
      const project = await prisma.projects.findUnique({
        where: { project_id: projectId }
      });

      if (project) {
        const isOwner = project.owner_id === userId;
        const isMember = await prisma.project_members.findUnique({
          where: {
            project_id_user_id: {
              project_id: projectId,
              user_id: userId
            }
          }
        });

        if (isOwner || isMember) {
          accessibleProjectIds.add(projectId);
        }
      }
    }

    // Return only tasks from accessible projects
    return tasks.filter(task => accessibleProjectIds.has(task.project_id));
  } catch (error) {
    log.error(NAMESPACE, `getTasksByStatus: ${error.message}`);
    throw error;
  }
};

const createTask = async (taskData, userId) => {
  try {
    const { project_id, status_id, assignee_id, ...otherFields } = taskData;

    // Check if user has access to the project
    const project = await prisma.projects.findUnique({
      where: { project_id: Number(project_id) }
    });

    if (!project) {
      throw new Error('Project not found');
    }

    const isOwner = project.owner_id === userId;
    const isMember = await prisma.project_members.findUnique({
      where: {
        project_id_user_id: {
          project_id: Number(project_id),
          user_id: userId
        }
      }
    });

    if (!isOwner && !isMember) {
      throw new Error('Not authorized to create tasks in this project');
    }

    // If assignee is specified, verify they are a project member
    if (assignee_id) {
      const assigneeMember = await prisma.project_members.findUnique({
        where: {
          project_id_user_id: {
            project_id: Number(project_id),
            user_id: Number(assignee_id)
          }
        }
      });

      if (!assigneeMember) {
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
      throw new Error('Task not found');
    }

    // Check if user has access to the project
    const project = await prisma.projects.findUnique({
      where: { project_id: task.project_id }
    });

    if (!project) {
      throw new Error('Project not found');
    }

    const isOwner = project.owner_id === userId;
    const isMember = await prisma.project_members.findUnique({
      where: {
        project_id_user_id: {
          project_id: task.project_id,
          user_id: userId
        }
      }
    });

    if (!isOwner && !isMember) {
      throw new Error('Not authorized to update this task');
    }

    // If assignee is specified, verify they are a project member
    if (taskData.assignee_id) {
      const assigneeMember = await prisma.project_members.findUnique({
        where: {
          project_id_user_id: {
            project_id: task.project_id,
            user_id: Number(taskData.assignee_id)
          }
        }
      });

      if (!assigneeMember) {
        throw new Error('Assignee must be a member of the project');
      }
    }

    return await prisma.tasks.update({
      where: { task_id: Number(id) },
      data: {
        ...taskData,
        status_id: taskData.status_id ? Number(taskData.status_id) : undefined,
        assignee_id: taskData.assignee_id ? Number(taskData.assignee_id) : null,
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
      throw new Error('Task not found');
    }

    // Check if user is project owner or admin
    const project = await prisma.projects.findUnique({
      where: { project_id: task.project_id }
    });

    if (!project) {
      throw new Error('Project not found');
    }

    if (project.owner_id !== userId) {
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
      throw new Error('Task not found');
    }

    // Check if user has access to the project
    const project = await prisma.projects.findUnique({
      where: { project_id: task.project_id }
    });

    if (!project) {
      throw new Error('Project not found');
    }

    const isOwner = project.owner_id === userId;
    const isMember = await prisma.project_members.findUnique({
      where: {
        project_id_user_id: {
          project_id: task.project_id,
          user_id: userId
        }
      }
    });

    if (!isOwner && !isMember) {
      throw new Error('Not authorized to assign this task');
    }

    // Check if assignee is a member of the project
    if (assigneeId) {
      const assigneeMember = await prisma.project_members.findUnique({
        where: {
          project_id_user_id: {
            project_id: task.project_id,
            user_id: Number(assigneeId)
          }
        }
      });

      if (!assigneeMember) {
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
      throw new Error('Task not found');
    }

    // Check if user has access to the project
    const project = await prisma.projects.findUnique({
      where: { project_id: task.project_id }
    });

    if (!project) {
      throw new Error('Project not found');
    }

    const isOwner = project.owner_id === userId;
    const isMember = await prisma.project_members.findUnique({
      where: {
        project_id_user_id: {
          project_id: task.project_id,
          user_id: userId
        }
      }
    });

    if (!isOwner && !isMember) {
      throw new Error('Not authorized to update this task status');
    }

    // Check if status exists
    const status = await prisma.task_statuses.findUnique({
      where: { status_id: Number(statusId) }
    });

    if (!status) {
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

export default {
  getTaskById,
  getTasksByProject,
  getTasksByAssignee,
  getTasksByStatus,
  createTask,
  updateTask,
  deleteTask,
  assignTask,
  updateTaskStatus
}; 