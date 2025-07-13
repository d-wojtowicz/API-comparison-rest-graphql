import CONFIG from '../../../config/config.js';
import log from '../../../config/logging.js';
import prisma from '../../../db/client.js';
import { isProjectOwner, isProjectMember, isAdmin } from '../../utils/permissions.js';
import { notificationService } from '../../../services/notification.service.js';
import { CONSTANTS } from '../../../config/constants.js';

const NAMESPACE = CONFIG.server.env === 'PROD' ? 'PROJECT-SERVICE' : 'rest/services/projects.service.js';

const getProjectById = async (id, user) => {
  try {
    const project = await prisma.projects.findUnique({
      where: { project_id: Number(id) }
    });

    if (!project) {
      log.error(NAMESPACE, `getProjectById: Project not found`);
      throw new Error('Project not found');
    }

    // Check if user is owner, member, or admin
    const isOwner = await isProjectOwner(user.userId, Number(id));
    const isMember = await isProjectMember(user.userId, Number(id));

    if (!isOwner && !isMember && !isAdmin(user)) {
      log.error(NAMESPACE, `getProjectById: Not authorized to access this project`);
      throw new Error('Not authorized to access this project');
    }

    return project;
  } catch (error) {
    log.error(NAMESPACE, `getProjectById: ${error.message}`);
    throw error;
  }
};

const getAllProjects = async () => {
  try {
    return await prisma.projects.findMany();
  } catch (error) {
    log.error(NAMESPACE, `getAllProjects: ${error.message}`);
    throw error;
  }
};

const getMyProjects = async (user) => {
  try {
    // Get projects where user is owner or member
    const ownedProjects = await prisma.projects.findMany({
      where: { owner_id: user.userId }
    });

    const memberProjects = await prisma.projects.findMany({
      where: {
        project_members: {
          some: {
            user_id: user.userId
          }
        }
      }
    });

    // Combine and remove duplicates
    const allProjects = [...ownedProjects, ...memberProjects];
    const uniqueProjects = allProjects.filter((project, index, self) => 
      index === self.findIndex(p => p.project_id === project.project_id)
    );

    return uniqueProjects;
  } catch (error) {
    log.error(NAMESPACE, `getMyProjects: ${error.message}`);
    throw error;
  }
};

const getProjectMembers = async (projectId, user) => {
  try {
    const project = await prisma.projects.findUnique({
      where: { project_id: Number(projectId) }
    });

    if (!project) {
      log.error(NAMESPACE, `getProjectMembers: Project not found`);
      throw new Error('Project not found');
    }

    // Check if user is owner, member, or admin (admin check is handled by middleware)
    const isOwner = await isProjectOwner(user.userId, Number(projectId));
    const isMember = await isProjectMember(user.userId, Number(projectId));

    if (!isOwner && !isMember && !isAdmin(user)) {
      log.error(NAMESPACE, `getProjectMembers: Not authorized to view project members`);
      throw new Error('Not authorized to view project members');
    }

    return await prisma.project_members.findMany({
      where: { project_id: Number(projectId) }
    });
  } catch (error) {
    log.error(NAMESPACE, `getProjectMembers: ${error.message}`);
    throw error;
  }
};

const createProject = async (projectData, user) => {
  try {
    const { project_name, description } = projectData;

    const project = await prisma.projects.create({
      data: {
        project_name,
        description,
        owner_id: user.userId
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
  } catch (error) {
    log.error(NAMESPACE, `createProject: ${error.message}`);
    throw error;
  }
};

const updateProject = async (id, projectData, user) => {
  try {
    const project = await prisma.projects.findUnique({
      where: { project_id: Number(id) }
    });

    if (!project) {
      log.error(NAMESPACE, `updateProject: Project not found`);
      throw new Error('Project not found');
    }

    // Only owner can update project (admin check is handled by middleware)
    const isOwner = await isProjectOwner(user.userId, Number(id));

    if (!isOwner && !isAdmin(user)) {
      log.error(NAMESPACE, `updateProject: Not authorized to update this project`);
      throw new Error('Not authorized to update this project');
    }

    const updatedProject = await prisma.projects.update({
      where: { project_id: Number(id) },
      data: {
        ...projectData,
        updated_at: new Date()
      }
    });

    // Notify all project members about the update
    await notificationService.notifyProjectMembers(
      id,
      CONSTANTS.NOTIFICATIONS.TYPES.PROJECT.UPDATED,
      { projectName: updatedProject.project_name }
    );

    return updatedProject;
  } catch (error) {
    log.error(NAMESPACE, `updateProject: ${error.message}`);
    throw error;
  }
};

const deleteProject = async (id, user) => {
  try {
    const project = await prisma.projects.findUnique({
      where: { project_id: Number(id) },
      include: {
        project_members: true
      }
    });

    if (!project) {
      log.error(NAMESPACE, `deleteProject: Project not found`);
      throw new Error('Project not found');
    }

    // Only owner can delete project (admin check is handled by middleware)
    const isOwner = await isProjectOwner(user.userId, Number(id));

    if (!isOwner && !isAdmin(user)) {
      log.error(NAMESPACE, `deleteProject: Not authorized to delete this project`);
      throw new Error('Not authorized to delete this project');
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
      { projectName: project.project_name }
    );
    
    return true;
  } catch (error) {
    log.error(NAMESPACE, `deleteProject: ${error.message}`);
    throw error;
  }
};

const addProjectMember = async (projectId, memberUserId, role, user) => {
  try {
    const project = await prisma.projects.findUnique({
      where: { project_id: Number(projectId) }
    });

    if (!project) {
      log.error(NAMESPACE, `addProjectMember: Project not found`);
      throw new Error('Project not found');
    }

    // Only owner can add members (admin check is handled by middleware)
    const isOwner = await isProjectOwner(user.userId, Number(projectId));

    if (!isOwner && !isAdmin(user)) {
      log.error(NAMESPACE, `addProjectMember: Not authorized to add members to this project`);
      throw new Error('Not authorized to add members to this project');
    }

    // Check if user exists
    const targetUser = await prisma.users.findUnique({
      where: { user_id: Number(memberUserId) }
    });

    if (!targetUser) {
      log.error(NAMESPACE, `addProjectMember: User not found`);
      throw new Error('User not found');
    }

    // Check if user is already a member
    const existingMember = await prisma.project_members.findFirst({
      where: {
        project_id: Number(projectId),
        user_id: Number(memberUserId)
      }
    });

    if (existingMember) {
      log.error(NAMESPACE, `addProjectMember: User is already a member of this project`);
      throw new Error('User is already a member of this project');
    }

    const newMember = await prisma.project_members.create({
      data: {
        project_id: Number(projectId),
        user_id: Number(memberUserId),
        role
      }
    });

    // Create notification for the new member using the already fetched project data
    await notificationService.createNotification(
      memberUserId,
      CONSTANTS.NOTIFICATIONS.TYPES.PROJECT.ADDED_AS_MEMBER,
      { projectName: project.project_name }
    );

    return newMember;
  } catch (error) {
    log.error(NAMESPACE, `addProjectMember: ${error.message}`);
    throw error;
  }
};

const removeProjectMember = async (projectId, memberUserId, user) => {
  try {
    const project = await prisma.projects.findUnique({
      where: { project_id: Number(projectId) }
    });

    if (!project) {
      log.error(NAMESPACE, `removeProjectMember: Project not found`);
      throw new Error('Project not found');
    }

    // Only owner can remove members (admin check is handled by middleware)
    const isOwner = await isProjectOwner(user.userId, Number(projectId));

    if (!isOwner && !isAdmin(user)) {
      log.error(NAMESPACE, `removeProjectMember: Not authorized to remove members from this project`);
      throw new Error('Not authorized to remove members from this project');
    }

    // Prevent removing the project owner
    if (Number(memberUserId) === project.owner_id) {
      log.error(NAMESPACE, `removeProjectMember: Cannot remove project owner`);
      throw new Error('Cannot remove project owner');
    } 

    const member = await prisma.project_members.findFirst({
      where: {
        project_id: Number(projectId),
        user_id: Number(memberUserId)
      }
    });

    if (!member) {
      log.error(NAMESPACE, `removeProjectMember: User is not a member of this project`);
      throw new Error('User is not a member of this project');
    }

    await prisma.project_members.delete({
      where: {
        project_id_user_id: {
          project_id: Number(projectId),
          user_id: Number(memberUserId)
        }
      }
    });

    // Create notification for the removed member using the already fetched project data
    await notificationService.createNotification(
      Number(memberUserId),
      CONSTANTS.NOTIFICATIONS.TYPES.PROJECT.REMOVED_AS_MEMBER,
      { projectName: project.project_name }
    );

    return true;
  } catch (error) {
    log.error(NAMESPACE, `removeProjectMember: ${error.message}`);
    throw error;
  }
};

// Dependencies
const getTasksByProject = async (projectId, user) => {
  try {
    // Check if user has access to the project (admin check is handled by middleware)
    const isOwner = await isProjectOwner(user.userId, Number(projectId));
    const isMember = await isProjectMember(user.userId, Number(projectId));

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


export default {
  getProjectById,
  getAllProjects,
  getMyProjects,
  getProjectMembers,
  createProject,
  updateProject,
  deleteProject,
  addProjectMember,
  removeProjectMember,
  // Dependencies
  getTasksByProject
}; 