import CONFIG from '../../config/config.js';
import log from '../../config/logging.js';
import prisma from '../../db/client.js';
import { isProjectOwner, isProjectMember } from '../utils/permissions.js';

const NAMESPACE = CONFIG.server.env === 'PROD' ? 'PROJECT-SERVICE' : 'rest/services/projects.service.js';

const getProjectById = async (id, userId) => {
  try {
    const project = await prisma.projects.findUnique({
      where: { project_id: Number(id) }
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Check if user is owner, member, or admin (admin check is handled by middleware)
    const isOwner = await isProjectOwner(userId, Number(id));
    const isMember = await isProjectMember(userId, Number(id));

    if (!isOwner && !isMember) {
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

const getMyProjects = async (userId) => {
  try {
    // Get projects where user is owner or member
    const ownedProjects = await prisma.projects.findMany({
      where: { owner_id: userId }
    });

    const memberProjects = await prisma.projects.findMany({
      where: {
        project_members: {
          some: {
            user_id: userId
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

const getProjectMembers = async (projectId, userId) => {
  try {
    const project = await prisma.projects.findUnique({
      where: { project_id: Number(projectId) }
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Check if user is owner, member, or admin (admin check is handled by middleware)
    const isOwner = await isProjectOwner(userId, Number(projectId));
    const isMember = await isProjectMember(userId, Number(projectId));

    if (!isOwner && !isMember) {
      throw new Error('Not authorized to view project members');
    }

    return await prisma.project_members.findMany({
      where: { project_id: Number(projectId) },
      include: {
        users: true
      }
    });
  } catch (error) {
    log.error(NAMESPACE, `getProjectMembers: ${error.message}`);
    throw error;
  }
};

const createProject = async (projectData, userId) => {
  try {
    const { project_name, description } = projectData;

    const project = await prisma.projects.create({
      data: {
        project_name,
        description,
        owner_id: userId
      }
    });

    // Add owner as a project member
    await prisma.project_members.create({
      data: {
        project_id: project.project_id,
        user_id: userId,
        role: 'owner'
      }
    });

    return project;
  } catch (error) {
    log.error(NAMESPACE, `createProject: ${error.message}`);
    throw error;
  }
};

const updateProject = async (id, projectData, userId) => {
  try {
    const project = await prisma.projects.findUnique({
      where: { project_id: Number(id) }
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Only owner can update project (admin check is handled by middleware)
    const isOwner = await isProjectOwner(userId, Number(id));
    if (!isOwner) {
      throw new Error('Not authorized to update this project');
    }

    return await prisma.projects.update({
      where: { project_id: Number(id) },
      data: {
        ...projectData,
        updated_at: new Date()
      }
    });
  } catch (error) {
    log.error(NAMESPACE, `updateProject: ${error.message}`);
    throw error;
  }
};

const deleteProject = async (id, userId) => {
  try {
    const project = await prisma.projects.findUnique({
      where: { project_id: Number(id) },
      include: {
        project_members: true
      }
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Only owner can delete project (admin check is handled by middleware)
    const isOwner = await isProjectOwner(userId, Number(id));
    if (!isOwner) {
      throw new Error('Not authorized to delete this project');
    }

    // Delete project (project_members will be automatically deleted due to cascade)
    await prisma.projects.delete({
      where: { project_id: Number(id) }
    });

    return true;
  } catch (error) {
    log.error(NAMESPACE, `deleteProject: ${error.message}`);
    throw error;
  }
};

const addProjectMember = async (projectId, memberUserId, role, userId) => {
  try {
    const project = await prisma.projects.findUnique({
      where: { project_id: Number(projectId) }
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Only owner can add members (admin check is handled by middleware)
    const isOwner = await isProjectOwner(userId, Number(projectId));
    if (!isOwner) {
      throw new Error('Not authorized to add members to this project');
    }

    // Check if user exists
    const user = await prisma.users.findUnique({
      where: { user_id: Number(memberUserId) }
    });

    if (!user) {
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
      throw new Error('User is already a member of this project');
    }

    return await prisma.project_members.create({
      data: {
        project_id: Number(projectId),
        user_id: Number(memberUserId),
        role: role || 'member'
      },
      include: {
        users: true
      }
    });
  } catch (error) {
    log.error(NAMESPACE, `addProjectMember: ${error.message}`);
    throw error;
  }
};

const removeProjectMember = async (projectId, memberUserId, userId) => {
  try {
    const project = await prisma.projects.findUnique({
      where: { project_id: Number(projectId) }
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Only owner can remove members (admin check is handled by middleware)
    const isOwner = await isProjectOwner(userId, Number(projectId));
    if (!isOwner) {
      throw new Error('Not authorized to remove members from this project');
    }

    // Prevent removing the project owner
    if (Number(memberUserId) === project.owner_id) {
      throw new Error('Cannot remove project owner');
    }

    const member = await prisma.project_members.findFirst({
      where: {
        project_id: Number(projectId),
        user_id: Number(memberUserId)
      }
    });

    if (!member) {
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

    return true;
  } catch (error) {
    log.error(NAMESPACE, `removeProjectMember: ${error.message}`);
    throw error;
  }
};

// Dependencies
const getTasksByProject = async (projectId, userId) => {
  try {
    // Check if user has access to the project (admin check is handled by middleware)
    const isOwner = await isProjectOwner(userId, Number(projectId));
    const isMember = await isProjectMember(userId, Number(projectId));

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