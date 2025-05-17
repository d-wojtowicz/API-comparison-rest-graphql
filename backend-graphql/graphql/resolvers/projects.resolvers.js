import prisma from '../../db/client.js';
import log from '../../config/logging.js';
import CONFIG from '../../config/config.js';
import { CONSTANTS } from '../../config/constants.js';
import { notificationService } from '../../services/notification.service.js';

const NAMESPACE = CONFIG.server.env === 'PROD' ? 'PROJECT-RESOLVER' : 'graphql/resolvers/projects.resolvers.js';

// Helper functions
const isProjectOwner = (user, project) => user?.userId === project.owner_id;
const isProjectMember = (user, projectId) => projectId && user?.userId;
const isAdmin = (user) => user?.role === 'admin' || user?.role === 'superadmin';

export const projectResolvers = {
  Query: {
    project: async (_, { id }) => {
      return prisma.projects.findUnique({
        where: { project_id: Number(id) },
        include: {
          users: true,
          project_members: {
            include: {
              users: true
            }
          }
        }
      });
    },
    projects: async () => {
      return prisma.projects.findMany({
        include: {
          users: true,
          project_members: {
            include: {
              users: true
            }
          }
        }
      });
    },
    myProjects: async (_, __, { user }) => {
      if (!user) {
        log.error(NAMESPACE, 'myProjects: User not authenticated');
        throw new Error('Not authenticated');
      }

      return prisma.projects.findMany({
        where: {
          OR: [
            { owner_id: user.userId },
            {
              project_members: {
                some: {
                  user_id: user.userId
                }
              }
            }
          ]
        },
        include: {
          users: true,
          project_members: {
            include: {
              users: true
            }
          }
        }
      });
    },
    projectMembers: async (_, { project_id }, { user }) => {
      if (!user) {
        log.error(NAMESPACE, 'projectMembers: User not authenticated');
        throw new Error('Not authenticated');
      }

      const project = await prisma.projects.findUnique({
        where: { project_id: Number(project_id) }
      });

      if (!project) {
        log.error(NAMESPACE, 'projectMembers: Project not found');
        throw new Error('Project not found');
      }

      if (!isProjectOwner(user, project) && !isProjectMember(user, project_id)) {
        log.error(NAMESPACE, 'projectMembers: Not authorized to view project members');
        throw new Error('Not authorized');
      }

      return prisma.project_members.findMany({
        where: { project_id: Number(project_id) },
        include: {
          users: true
        }
      });
    }
  },
  Mutation: {
    createProject: async (_, { input }, { user }) => {
      if (!user) {
        log.error(NAMESPACE, 'createProject: User not authenticated');
        throw new Error('Not authenticated');
      }

      const { project_name, description } = input;
      const project = await prisma.projects.create({
        data: {
          project_name,
          description,
          owner_id: user.userId
        },
        include: {
          users: true
        }
      });

      // Add owner as a project member
      await prisma.project_members.create({
        data: {
          project_id: project.project_id,
          user_id: user.userId,
          role: 'owner'
        }
      });

      return project;
    },
    updateProject: async (_, { id, input }, { user }) => {
      if (!user) {
        log.error(NAMESPACE, 'updateProject: User not authenticated');
        throw new Error('Not authenticated');
      }

      const project = await prisma.projects.findUnique({
        where: { project_id: Number(id) }
      });

      if (!project) {
        log.error(NAMESPACE, 'updateProject: Project not found');
        throw new Error('Project not found');
      }

      if (!isProjectOwner(user, project) && !isAdmin(user)) {
        log.error(NAMESPACE, 'updateProject: Not authorized to update project');
        throw new Error('Not authorized');
      }

      const updatedProject = await prisma.projects.update({
        where: { project_id: Number(id) },
        data: {
          ...input,
          updated_at: new Date()
        },
        include: {
          users: true
        }
      });

      // Notify all project members about the update
      await notificationService.notifyProjectMembers(
        id,
        CONSTANTS.NOTIFICATIONS.TYPES.PROJECT.UPDATED,
        { projectName: updatedProject.project_name }
      );

      return updatedProject;
    },
    deleteProject: async (_, { id }, { user }) => {
      if (!user) {
        log.error(NAMESPACE, 'deleteProject: User not authenticated');
        throw new Error('Not authenticated');
      }

      const project = await prisma.projects.findUnique({
        where: { project_id: Number(id) },
        include: {
          project_members: true
        }
      });

      if (!project) {
        log.error(NAMESPACE, 'deleteProject: Project not found');
        throw new Error('Project not found');
      }

      if (!isProjectOwner(user, project) && !isAdmin(user)) {
        log.error(NAMESPACE, 'deleteProject: Not authorized to delete project');
        throw new Error('Not authorized');
      }

      // Get project details and members for notifications before deletion
      const projectDetails = await prisma.projects.findUnique({
        where: { project_id: Number(id) },
        include: {
          project_members: true
        }
      });

      await prisma.projects.delete({
        where: { project_id: Number(id) }
      });

      // Notify all project members about deletion
      const memberIds = projectDetails.project_members.map(member => member.user_id);
      await notificationService.createNotifications(
        memberIds,
        CONSTANTS.NOTIFICATIONS.TYPES.PROJECT.DELETED,
        { projectName: projectDetails.project_name }
      );

      return true;
    },
    addProjectMember: async (_, { projectId, userId, role }, { user }) => {
      if (!user) {
        log.error(NAMESPACE, 'addProjectMember: User not authenticated');
        throw new Error('Not authenticated');
      }

      const project = await prisma.projects.findUnique({
        where: { project_id: Number(projectId) }
      });

      if (!project) {
        log.error(NAMESPACE, 'addProjectMember: Project not found');
        throw new Error('Project not found');
      }

      if (!isProjectOwner(user, project) && !isAdmin(user)) {
        log.error(NAMESPACE, 'addProjectMember: Not authorized to add members');
        throw new Error('Not authorized');
      }

      const member = await prisma.project_members.create({
        data: {
          project_id: Number(projectId),
          user_id: Number(userId),
          role
        }
      });

      // Get project details for notification
      const projectDetails = await prisma.projects.findUnique({
        where: { project_id: Number(projectId) }
      });

      // Create notification for the new member
      await notificationService.createNotification(
        userId,
        CONSTANTS.NOTIFICATIONS.TYPES.PROJECT.ADDED_AS_MEMBER,
        { projectName: projectDetails.project_name }
      );

      return member;
    },
    removeProjectMember: async (_, { projectId, userId }, { user }) => {
      if (!user) {
        log.error(NAMESPACE, 'removeProjectMember: User not authenticated');
        throw new Error('Not authenticated');
      }

      const project = await prisma.projects.findUnique({
        where: { project_id: Number(projectId) }
      });

      if (!project) {
        log.error(NAMESPACE, 'removeProjectMember: Project not found');
        throw new Error('Project not found');
      }

      if (!isProjectOwner(user, project) && !isAdmin(user)) {
        log.error(NAMESPACE, 'removeProjectMember: Not authorized to remove members');
        throw new Error('Not authorized');
      }

      // Get project details for notification before deletion
      const projectDetails = await prisma.projects.findUnique({
        where: { project_id: Number(projectId) }
      });

      await prisma.project_members.delete({
        where: {
          project_id_user_id: {
            project_id: Number(projectId),
            user_id: Number(userId)
          }
        }
      });

      // Create notification for the removed member
      await notificationService.createNotification(
        userId,
        CONSTANTS.NOTIFICATIONS.TYPES.PROJECT.REMOVED_AS_MEMBER,
        { projectName: projectDetails.project_name }
      );

      return true;
    }
  },
  Project: {
    owner: (parent) => {
      return prisma.users.findUnique({
        where: { user_id: parent.owner_id }
      });
    },
    members: (parent) => {
      return prisma.project_members.findMany({
        where: { project_id: parent.project_id },
        include: {
          users: true
        }
      });
    },
    tasks: (parent) => {
      return prisma.tasks.findMany({
        where: { project_id: parent.project_id },
        orderBy: { created_at: 'desc' }
      });
    }
  },
  ProjectMember: {
    project: (parent) => {
      return prisma.projects.findUnique({
        where: { project_id: parent.project_id }
      });
    },
    user: (parent) => {
      return prisma.users.findUnique({
        where: { user_id: parent.user_id }
      });
    }
  }
}; 