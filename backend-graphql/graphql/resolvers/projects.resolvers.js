import prisma from '../../db/client.js';
import log from '../../config/logging.js';
import CONFIG from '../../config/config.js';
import { CONSTANTS } from '../../config/constants.js';
import { notificationService } from '../../services/notification.service.js';

const NAMESPACE = CONFIG.server.env === 'PROD' ? 'PROJECT-RESOLVER' : 'graphql/resolvers/projects.resolvers.js';

// Helper functions
const isProjectOwner = (user, project) => user?.userId === project.owner_id;
const isProjectMember = async (user, projectId, loaders) => {
  if (!user || !projectId) return false;
  
  const members = await loaders.projectMembersByProjectLoader.load(Number(projectId));
  return members.some(member => member.user_id === user.userId);
};
const isAdmin = (user) => user?.role === 'admin' || user?.role === 'superadmin';

export const projectResolvers = {
  Query: {
    project: async (_, { id }, { user, loaders }) => {
      if (!user) {
        log.error(NAMESPACE, 'project: User not authenticated');
        throw new Error('Not authenticated');
      }

      const project = await loaders.projectLoader.load(Number(id));

      if (!project) {
        log.error(NAMESPACE, 'project: Project not found');
        throw new Error('Project not found');
      }

      if (!isProjectOwner(user, project) && !(await isProjectMember(user, project.project_id, loaders)) && !isAdmin(user)) {
        log.error(NAMESPACE, 'project: Not authorized to access this project');
        throw new Error('Not authorized');
      }

      return project;
    },
    projects: async (_, __, { user, loaders }) => {
      if (!user) {
        log.error(NAMESPACE, 'projects: User not authenticated');
        throw new Error('Not authenticated');
      }

      if (!isAdmin(user)) {
        log.error(NAMESPACE, 'projects: Not authorized to access all projects');
        throw new Error('Not authorized');
      }

      return prisma.projects.findMany();
    },
    myProjects: async (_, __, { user, loaders }) => {
      if (!user) {
        log.error(NAMESPACE, 'myProjects: User not authenticated');
        throw new Error('Not authenticated');
      }

      const myProjects = await loaders.myProjectsLoader.load(user.userId);

      return myProjects;
    },
    projectMembers: async (_, { project_id }, { user, loaders }) => {
      if (!user) {
        log.error(NAMESPACE, 'projectMembers: User not authenticated');
        throw new Error('Not authenticated');
      }

      const project = await loaders.projectLoader.load(Number(project_id));

      if (!project) {
        log.error(NAMESPACE, 'projectMembers: Project not found');
        throw new Error('Project not found');
      }

      if (!isProjectOwner(user, project) && !await isProjectMember(user, project_id, loaders) && !isAdmin(user)) {
        log.error(NAMESPACE, 'projectMembers: Not authorized to view project members');
        throw new Error('Not authorized');
      }

      return loaders.projectMembersByProjectLoader.load(Number(project_id));
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
    updateProject: async (_, { id, input }, { user, pubsub }) => {
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
        { projectName: updatedProject.project_name },
        pubsub
      );

      return updatedProject;
    },
    deleteProject: async (_, { id }, { user, loaders, pubsub }) => {
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

      // Delete project (project_members will be automatically deleted due to cascade)
      await prisma.projects.delete({
        where: { project_id: Number(id) }
      });

      // Notify all project members about deletion using the already fetched project data
      const memberIds = project.project_members.map(member => member.user_id);
      await notificationService.createNotifications(
        memberIds,
        CONSTANTS.NOTIFICATIONS.TYPES.PROJECT.DELETED,
        { projectName: project.project_name },
        pubsub
      );

      return true;
    },
    addProjectMember: async (_, { input }, { user, loaders, pubsub }) => {
      if (!user) {
        log.error(NAMESPACE, 'addProjectMember: User not authenticated');
        throw new Error('Not authenticated');
      }

      const { project_id, user_id, role } = input;

      const project = await loaders.projectLoader.load(Number(project_id));

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
          project_id: Number(project_id),
          user_id: Number(user_id),
          role
        }
      });

      // Create notification for the new member using the already fetched project data
      await notificationService.createNotification(
        user_id,
        CONSTANTS.NOTIFICATIONS.TYPES.PROJECT.ADDED_AS_MEMBER,
        { projectName: project.project_name },
        pubsub
      );

      return member;
    },
    removeProjectMember: async (_, { user_id, project_id }, { user, loaders, pubsub }) => {
      if (!user) {
        log.error(NAMESPACE, 'removeProjectMember: User not authenticated');
        throw new Error('Not authenticated');
      }

      const project = await loaders.projectLoader.load(Number(project_id));

      if (!project) {
        log.error(NAMESPACE, 'removeProjectMember: Project not found');
        throw new Error('Project not found');
      }

      if (!isProjectOwner(user, project) && !isAdmin(user)) {
        log.error(NAMESPACE, 'removeProjectMember: Not authorized to remove members');
        throw new Error('Not authorized');
      }

      // Check if the member exists
      const member = await prisma.project_members.findUnique({
        where: {
          project_id_user_id: {
            project_id: Number(project_id),
            user_id: Number(user_id)
          }
        }
      });

      if (!member) {
        log.error(NAMESPACE, 'removeProjectMember: Member not found in project');
        throw new Error('Member is not part of this project');
      }

      await prisma.project_members.delete({
        where: {
          project_id_user_id: {
            project_id: Number(project_id),
            user_id: Number(user_id)
          }
        }
      });

      // Create notification for the removed member using the already fetched project data
      await notificationService.createNotification(
        Number(user_id),
        CONSTANTS.NOTIFICATIONS.TYPES.PROJECT.REMOVED_AS_MEMBER,
        { projectName: project.project_name },
        pubsub
      );

      return true;
    }
  },
  Project: {
    owner: (parent, _, { loaders }) => {
      return loaders.userLoader.load(parent.owner_id);
    },
    members: (parent, _, { loaders }) => {
      return loaders.projectMembersByProjectLoader.load(parent.project_id);
    },
    tasks: (parent, _, { loaders }) => {
      return loaders.tasksByProjectLoader.load(parent.project_id);
    }
  },
  ProjectMember: {
    project: (parent, _, { loaders }) => {
      return loaders.projectLoader.load(parent.project_id);
    },
    user: (parent, _, { loaders }) => {
      return loaders.userLoader.load(parent.user_id);
    }
  }
}; 