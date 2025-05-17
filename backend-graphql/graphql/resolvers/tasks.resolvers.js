import prisma from '../../db/client.js';
import log from '../../config/logging.js';
import CONFIG from '../../config/config.js';

const NAMESPACE = CONFIG.server.env === 'PROD' ? 'TASK-RESOLVER' : 'graphql/resolvers/tasks.resolvers.js';

// Helper functions
const isSuperAdmin = (user) => user?.role === 'superadmin';
const isAdmin = (user) => user?.role === 'admin' || isSuperAdmin(user);
const isSelf = (user, targetUserId) => user?.userId === targetUserId;
const isProjectMember = async (userId, projectId) => {
  const member = await prisma.project_members.findUnique({
    where: {
      project_id_user_id: {
        project_id: Number(projectId),
        user_id: userId
      }
    }
  });
  return !!member;
};
const isProjectOwner = async (userId, projectId) => {
  const project = await prisma.projects.findUnique({
    where: { project_id: Number(projectId) }
  });
  return project?.owner_id === userId;
};
const hasTaskAccess = async (user, task) => {
  if (!user) return false;
  
  const isOwner = await isProjectOwner(user.userId, task.project_id);
  const isMember = await isProjectMember(user.userId, task.project_id);
  return isOwner || isMember;
};

export const taskResolvers = {
  Query: {
    task: async (_, { id }, { user }) => {
      const task = await prisma.tasks.findUnique({
        where: { task_id: Number(id) }
      });

      if (!task) {
        log.error(NAMESPACE, 'task: Task not found');
        throw new Error('Task not found');
      }

      if (!await hasTaskAccess(user, task) && !isAdmin(user)) {
        log.error(NAMESPACE, 'task: User not authorized to view this task');
        throw new Error('Not authorized to view this task');
      }

      return task;
    },
    tasks: async (_, __, { user }) => {
      if (!user) {
        log.error(NAMESPACE, 'tasks: User not authenticated');
        throw new Error('Not authenticated');
      }

      // Superadmin can view all tasks
      if (isSuperAdmin(user)) {
        return prisma.tasks.findMany({
          orderBy: { created_at: 'desc' }
        });
      }

      // Other users can only view tasks from projects they are a member of
      const userProjects = await prisma.project_members.findMany({
        where: { user_id: user.userId },
        select: { project_id: true }
      });

      const ownedProjects = await prisma.projects.findMany({
        where: { owner_id: user.userId },
        select: { project_id: true }
      });

      const projectIds = [
        ...userProjects.map(p => p.project_id),
        ...ownedProjects.map(p => p.project_id)
      ];

      return prisma.tasks.findMany({
        where: {
          project_id: { in: projectIds }
        },
        orderBy: { created_at: 'desc' }
      });
    },
    tasksByProject: async (_, { projectId }, { user }) => {
      if (!await hasTaskAccess(user, { project_id: Number(projectId) }) && !isAdmin(user)) {
        log.error(NAMESPACE, 'tasksByProject: User not authorized to view tasks in this project');
        throw new Error('Not authorized to view tasks in this project');
      }

      return prisma.tasks.findMany({
        where: { project_id: Number(projectId) },
        orderBy: { created_at: 'desc' }
      });
    },
    tasksByAssignee: async (_, { assigneeId }, { user }) => {
      if (!user) {
        log.error(NAMESPACE, 'tasksByAssignee: User not authenticated');
        throw new Error('Not authenticated');
      }

      // Users can only view their own assigned tasks unless they're admin
      if (!isAdmin(user) && !isSelf(user, Number(assigneeId))) {
        log.error(NAMESPACE, 'tasksByAssignee: User not authorized to view these tasks');
        throw new Error('Not authorized to view these tasks');
      }

      return prisma.tasks.findMany({
        where: { assignee_id: Number(assigneeId) },
        orderBy: { created_at: 'desc' }
      });
    },
    tasksByStatus: async (_, { statusId }, { user }) => {
      if (!user) {
        log.error(NAMESPACE, 'tasksByStatus: User not authenticated');
        throw new Error('Not authenticated');
      }

      // Superadmin can view all tasks
      if (isSuperAdmin(user)) {
        return prisma.tasks.findMany({
          where: { status_id: Number(statusId) },
          orderBy: { created_at: 'desc' }
        });
      }

      // Other users can only view tasks from projects they are a member of
      const userProjects = await prisma.project_members.findMany({
        where: { user_id: user.userId },
        select: { project_id: true }
      });

      const ownedProjects = await prisma.projects.findMany({
        where: { owner_id: user.userId },
        select: { project_id: true }
      });

      const projectIds = [
        ...userProjects.map(p => p.project_id),
        ...ownedProjects.map(p => p.project_id)
      ];

      return prisma.tasks.findMany({
        where: {
          status_id: Number(statusId),
          project_id: { in: projectIds }
        },
        orderBy: { created_at: 'desc' }
      });
    }
  },
  Mutation: {
    createTask: async (_, { input }, { user }) => {
      if (!user) {
        log.error(NAMESPACE, 'createTask: User not authenticated');
        throw new Error('Not authenticated');
      }

      const { project_id, status_id, assignee_id, ...otherFields } = input;

      // Check if user has access to the project
      if (!await hasTaskAccess(user, { project_id: Number(project_id) }) && !isAdmin(user)) {
        log.error(NAMESPACE, 'createTask: User not authorized to create tasks in this project');
        throw new Error('Not authorized to create tasks in this project');
      }

      // If assignee is specified, verify they are a project member
      if (assignee_id && !await isProjectMember(Number(assignee_id), Number(project_id))) {
        log.error(NAMESPACE, 'createTask: Assignee must be a member of the project');
        throw new Error('Assignee must be a member of the project');
      }

      return prisma.tasks.create({
        data: {
          ...otherFields,
          project_id: Number(project_id),
          status_id: Number(status_id),
          assignee_id: assignee_id ? Number(assignee_id) : null
        }
      });
    },
    updateTask: async (_, { id, input }, { user }) => {
      if (!user) {
        log.error(NAMESPACE, 'updateTask: User not authenticated');
        throw new Error('Not authenticated');
      }

      const task = await prisma.tasks.findUnique({
        where: { task_id: Number(id) }
      });

      if (!task) {
        log.error(NAMESPACE, 'updateTask: Task not found');
        throw new Error('Task not found');
      }

      if (!await hasTaskAccess(user, task) && !isAdmin(user)) {
        log.error(NAMESPACE, 'updateTask: User not authorized to update this task');
        throw new Error('Not authorized to update this task');
      }

      return prisma.tasks.update({
        where: { task_id: Number(id) },
        data: {
          ...input,
          status_id: input.status_id ? Number(input.status_id) : undefined,
          assignee_id: input.assignee_id ? Number(input.assignee_id) : null,
          updated_at: new Date()
        }
      });
    },
    deleteTask: async (_, { id }, { user }) => {
      if (!user) {
        log.error(NAMESPACE, 'deleteTask: User not authenticated');
        throw new Error('Not authenticated');
      }

      const task = await prisma.tasks.findUnique({
        where: { task_id: Number(id) }
      });

      if (!task) {
        log.error(NAMESPACE, 'deleteTask: Task not found');
        throw new Error('Task not found');
      }

      if (!isAdmin(user) && !await isProjectOwner(user.userId, task.project_id)) {
        log.error(NAMESPACE, 'deleteTask: User not authorized to delete this task');
        throw new Error('Not authorized to delete this task');
      }

      await prisma.tasks.delete({
        where: { task_id: Number(id) }
      });

      return true;
    },
    assignTask: async (_, { id, assigneeId }, { user }) => {
      if (!user) {
        log.error(NAMESPACE, 'assignTask: User not authenticated');
        throw new Error('Not authenticated');
      }

      const task = await prisma.tasks.findUnique({
        where: { task_id: Number(id) }
      });

      if (!task) {
        log.error(NAMESPACE, 'assignTask: Task not found');
        throw new Error('Task not found');
      }

      if (!await hasTaskAccess(user, task) && !isAdmin(user)) {
        log.error(NAMESPACE, 'assignTask: User not authorized to assign this task');
        throw new Error('Not authorized to assign this task');
      }

      // Check if assignee is a member of the project
      if (assigneeId && !await isProjectMember(Number(assigneeId), task.project_id)) {
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
    updateTaskStatus: async (_, { id, statusId }, { user }) => {
      if (!user) {
        log.error(NAMESPACE, 'updateTaskStatus: User not authenticated');
        throw new Error('Not authenticated');
      }

      const task = await prisma.tasks.findUnique({
        where: { task_id: Number(id) }
      });

      if (!task) {
        log.error(NAMESPACE, 'updateTaskStatus: Task not found');
        throw new Error('Task not found');
      }

      if (!await hasTaskAccess(user, task) && !isAdmin(user)) {
        log.error(NAMESPACE, 'updateTaskStatus: User not authorized to update this task status');
        throw new Error('Not authorized to update this task status');
      }

      // Check if status exists
      const status = await prisma.task_statuses.findUnique({
        where: { status_id: Number(statusId) }
      });

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
    status: (parent) => {
      return prisma.task_statuses.findUnique({
        where: { status_id: parent.status_id }
      });
    },
    project: (parent) => {
      return prisma.projects.findUnique({
        where: { project_id: parent.project_id }
      });
    },
    assignee: (parent) => {
      return parent.assignee_id
        ? prisma.users.findUnique({
            where: { user_id: parent.assignee_id }
          })
        : null;
    },
    comments: (parent) => {
      return prisma.task_comments.findMany({
        where: { task_id: parent.task_id },
        orderBy: { created_at: 'desc' }
      });
    },
    attachments: (parent) => {
      return prisma.task_attachments.findMany({
        where: { task_id: parent.task_id },
        orderBy: { uploaded_at: 'desc' }
      });
    }
  }
}; 