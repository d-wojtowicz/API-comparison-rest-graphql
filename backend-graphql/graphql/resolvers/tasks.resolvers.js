import prisma from '../../db/client.js';
import log from '../../config/logging.js';
import CONFIG from '../../config/config.js';
import { CONSTANTS } from '../../config/constants.js';
import { notificationService } from '../../services/notification.service.js';

const NAMESPACE = CONFIG.server.env === 'PROD' ? 'TASK-RESOLVER' : 'graphql/resolvers/tasks.resolvers.js';

// Helper functions
const isSuperAdmin = (user) => user?.role === 'superadmin';
const isAdmin = (user) => user?.role === 'admin' || isSuperAdmin(user);
const isSelf = (user, targetUserId) => user?.userId === targetUserId;
const isProjectMember = async (userId, projectId, loaders) => {
  const project = await loaders.projectLoader.load(Number(projectId));
  if (!project) return false;
  
  const member = await prisma.project_members.findFirst({
    where: {
      AND: [
        { project_id: Number(projectId) },
        { user_id: userId }
      ]
    }
  });
  return !!member;
};
const isProjectOwner = async (userId, projectId, loaders) => {
  const project = await loaders.projectLoader.load(Number(projectId));
  return project?.owner_id === userId;
};
const hasTaskAccess = async (user, task, loaders) => {
  if (!user) return false;
  if (!task?.project_id) return false;
  
  const [project, projectMembers] = await Promise.all([
    loaders.projectLoader.load(Number(task.project_id)),
    loaders.projectMembersByProjectLoader.load(Number(task.project_id))
  ]);

  if (!project) return false;

  return project.owner_id === user.userId ||
         projectMembers.some(member => member.user_id === user.userId);
};

export const taskResolvers = {
  Query: {
    task: async (_, { id }, { user, loaders }) => {
      if (!user) {
        log.error(NAMESPACE, 'task: User not authenticated');
        throw new Error('Not authenticated');
      }

      const task = await loaders.taskLoader.load(Number(id));

      if (!task) {
        log.error(NAMESPACE, 'task: Task not found');
        throw new Error('Task not found');
      }

      if (!await hasTaskAccess(user, task, loaders) && !isAdmin(user)) {
        log.error(NAMESPACE, 'task: User not authorized to view this task');
        throw new Error('Not authorized to view this task');
      }

      return task;
    },

    tasksByProject: async (_, { projectId }, { user, loaders }) => {
      if (!user) {
        log.error(NAMESPACE, 'tasksByProject: User not authenticated');
        throw new Error('Not authenticated');
      }

      const tasks = await loaders.tasksByProjectLoader.load(Number(projectId));

      if (!await hasTaskAccess(user, { project_id: Number(projectId) }, loaders) && !isAdmin(user)) {
        log.error(NAMESPACE, 'tasksByProject: User not authorized to view tasks in this project');
        throw new Error('Not authorized to view tasks in this project');
      }

      return tasks;
    },

    tasksByAssignee: async (_, { assigneeId }, { user, loaders }) => {
      if (!user) {
        log.error(NAMESPACE, 'tasksByAssignee: User not authenticated');
        throw new Error('Not authenticated');
      }

      const tasks = await loaders.tasksByAssigneeLoader.load(Number(assigneeId));

      // Users can only view their own assigned tasks unless they're admin
      if (!isAdmin(user) && !isSelf(user, Number(assigneeId))) {
        log.error(NAMESPACE, 'tasksByAssignee: User not authorized to view these tasks');
        throw new Error('Not authorized to view these tasks');
      }

      return tasks;
    },

    tasksByStatus: async (_, { statusId }, { user, loaders }) => {
      if (!user) {
        log.error(NAMESPACE, 'tasksByStatus: User not authenticated');
        throw new Error('Not authenticated');
      }

      const tasks = await loaders.tasksByStatusLoader.load(Number(statusId));
      if (!tasks.length) return [];

      // For admin users, return all tasks
      if (isAdmin(user)) return tasks;

      // For regular users, filter tasks based on project access
      const projectIds = [...new Set(tasks.map(task => task.project_id))];
      
      // Check which projects the user has access to
      const projects = await Promise.all(
        projectIds.map(id => loaders.projectLoader.load(id))
      );
      
      const accessibleProjectIds = projects
        .filter(project => 
          project && (
            project.owner_id === user.userId ||
            project.project_members?.some(member => member.user_id === user.userId)
          )
        )
        .map(project => project.project_id);

      // Return only tasks from accessible projects
      return tasks.filter(task => accessibleProjectIds.includes(task.project_id));
    }
  },

  Mutation: {
    createTask: async (_, { input }, { user, loaders }) => {
      if (!user) {
        log.error(NAMESPACE, 'createTask: User not authenticated');
        throw new Error('Not authenticated');
      }

      const { project_id, status_id, assignee_id, ...otherFields } = input;

      // Check if user has access to the project
      if (!await hasTaskAccess(user, { project_id: Number(project_id) }, loaders) && !isAdmin(user)) {
        log.error(NAMESPACE, 'createTask: User not authorized to create tasks in this project');
        throw new Error('Not authorized to create tasks in this project');
      }

      // If assignee is specified, verify they are a project member
      if (assignee_id && !await isProjectMember(Number(assignee_id), Number(project_id), loaders)) {
        log.error(NAMESPACE, 'createTask: Assignee must be a member of the project');
        throw new Error('Assignee must be a member of the project');
      }

      return await prisma.$transaction(async (tx) => {
        const task = await tx.tasks.create({
          data: {
            ...otherFields,
            project_id: Number(project_id),
            status_id: Number(status_id),
            assignee_id: assignee_id ? Number(assignee_id) : null,
            due_date: otherFields.due_date ? new Date(otherFields.due_date).toISOString() : null
          }
        });

        // If task is assigned, notify the assignee
        if (assignee_id) {
          const project = await loaders.projectLoader.load(Number(project_id));
          await notificationService.createNotification(
            assignee_id,
            CONSTANTS.NOTIFICATIONS.TYPES.TASK.ASSIGNED,
            {
              taskName: task.task_name,
              projectName: project.project_name
            }
          );
        }

        return task;
      });
    },

    updateTask: async (_, { id, input }, { user, loaders }) => {
      if (!user) {
        log.error(NAMESPACE, 'updateTask: User not authenticated');
        throw new Error('Not authenticated');
      }

      const task = await loaders.taskLoader.load(Number(id));
      if (!task) {
        log.error(NAMESPACE, 'updateTask: Task not found');
        throw new Error('Task not found');
      }

      if (!await hasTaskAccess(user, task, loaders) && !isAdmin(user)) {
        log.error(NAMESPACE, 'updateTask: User not authorized to update this task');
        throw new Error('Not authorized to update this task');
      }

      // If assignee is specified, verify they are a project member
      if (input.assignee_id && !await isProjectMember(Number(input.assignee_id), task.project_id, loaders)) {
        log.error(NAMESPACE, 'updateTask: Assignee must be a member of the project');
        throw new Error('Assignee must be a member of the project');
      }

      return await prisma.$transaction(async (tx) => {
        const updatedTask = await tx.tasks.update({
          where: { task_id: Number(id) },
          data: {
            ...input,
            status_id: input.status_id ? Number(input.status_id) : undefined,
            assignee_id: input.assignee_id ? Number(input.assignee_id) : null,
            updated_at: new Date()
          }
        });

        // Handle notifications for different types of updates
        if (input.status_id && input.status_id !== task.status_id) {
          const status = await loaders.statusLoader.load(Number(input.status_id));
          await notificationService.notifyTaskAssignee(id, CONSTANTS.NOTIFICATIONS.TYPES.TASK.STATUS_CHANGED, {
            taskName: task.task_name,
            status: status.status_name
          });
        }

        if (input.priority !== undefined && input.priority !== task.priority) {
          await notificationService.notifyTaskAssignee(id, CONSTANTS.NOTIFICATIONS.TYPES.TASK.PRIORITY_CHANGED, {
            taskName: task.task_name,
            priority: input.priority
          });
        }

        if (input.due_date && input.due_date !== task.due_date) {
          await notificationService.notifyTaskAssignee(id, CONSTANTS.NOTIFICATIONS.TYPES.TASK.DUE_DATE_CHANGED, {
            taskName: task.task_name,
            dueDate: new Date(input.due_date).toLocaleDateString()
          });
        }

        if (input.assignee_id !== undefined && input.assignee_id !== task.assignee_id) {
          const project = await loaders.projectLoader.load(task.project_id);
          if (input.assignee_id) {
            await notificationService.createNotification(
              input.assignee_id,
              CONSTANTS.NOTIFICATIONS.TYPES.TASK.ASSIGNED,
              {
                taskName: task.task_name,
                projectName: project.project_name
              }
            );
          }
          if (task.assignee_id) {
            await notificationService.createNotification(
              task.assignee_id,
              CONSTANTS.NOTIFICATIONS.TYPES.TASK.UNASSIGNED,
              {
                taskName: task.task_name,
                projectName: project.project_name
              }
            );
          }
        }

        return updatedTask;
      });
    },
    deleteTask: async (_, { id }, { user, loaders}) => {
      if (!user) {
        log.error(NAMESPACE, 'deleteTask: User not authenticated');
        throw new Error('Not authenticated');
      }

      const task = await loaders.taskLoader.load(Number(id));
      if (!task) {
        log.error(NAMESPACE, 'deleteTask: Task not found');
        throw new Error('Task not found');
      }

      if (!isAdmin(user) && !await isProjectOwner(user.userId, task.project_id, loaders)) {
        log.error(NAMESPACE, 'deleteTask: User not authorized to delete this task');
        throw new Error('Not authorized to delete this task');
      }

      if (task.assignee_id) {
        const project = await loaders.projectLoader.load(task.project_id);
        await notificationService.createNotification(
          task.assignee_id,
          CONSTANTS.NOTIFICATIONS.TYPES.TASK.DELETED,
          {
            taskName: task.task_name,
            projectName: project.project_name
          }
        );
      }

      await prisma.tasks.delete({
        where: { task_id: Number(id) }
      });

      return true;
    },

    assignTask: async (_, { id, assigneeId }, { user, loaders }) => {
      if (!user) {
        log.error(NAMESPACE, 'assignTask: User not authenticated');
        throw new Error('Not authenticated');
      }

      const task = await loaders.taskLoader.load(Number(id));
      if (!task) {
        log.error(NAMESPACE, 'assignTask: Task not found');
        throw new Error('Task not found');
      }

      if (!await hasTaskAccess(user, task, loaders) && !isAdmin(user)) {
        log.error(NAMESPACE, 'assignTask: User not authorized to assign this task');
        throw new Error('Not authorized to assign this task');
      }

      // Check if assignee is a member of the project
      if (assigneeId && !await isProjectMember(Number(assigneeId), task.project_id, loaders)) {
        log.error(NAMESPACE, 'assignTask: Assignee must be a member of the project');
        throw new Error('Assignee must be a member of the project');
      }

      return prisma.tasks.update({
        where: { task_id: Number(id) },
        data: {
          assignee_id: assigneeId ? Number(assigneeId) : null,
          updated_at: new Date()
        }
      });
    },

    updateTaskStatus: async (_, { id, statusId }, { user, loaders }) => {
      if (!user) {
        log.error(NAMESPACE, 'updateTaskStatus: User not authenticated');
        throw new Error('Not authenticated');
      }

      const task = await loaders.taskLoader.load(Number(id));
      if (!task) {
        log.error(NAMESPACE, 'updateTaskStatus: Task not found');
        throw new Error('Task not found');
      }

      if (!await hasTaskAccess(user, task, loaders) && !isAdmin(user)) {
        log.error(NAMESPACE, 'updateTaskStatus: User not authorized to update this task status');
        throw new Error('Not authorized to update this task status');
      }

      // Check if status exists
      const status = await loaders.statusLoader.load(Number(statusId));
      if (!status) {
        log.error(NAMESPACE, 'updateTaskStatus: Status not found');
        throw new Error('Status not found');
      }

      return prisma.tasks.update({
        where: { task_id: Number(id) },
        data: {
          status_id: Number(statusId),
          updated_at: new Date()
        }
      });
    }
  },

  Task: {
    project: (parent, _, { loaders }) => {
      return loaders.projectLoader.load(parent.project_id);
    },
    status: (parent, _, { loaders }) => {
      return loaders.statusLoader.load(parent.status_id);
    },
    assignee: (parent, _, { loaders }) => {
      return loaders.userLoader.load(parent.assignee_id);
    },
    comments: (parent, _, { loaders }) => {
      return loaders.taskCommentsLoader.load(parent.task_id);
    },
    attachments: (parent, _, { loaders }) => {
      return loaders.taskAttachmentsLoader.load(parent.task_id);
    }
  }
}; 