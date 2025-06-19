import prisma from '../../db/client.js';

// Helper functions for business logic permissions
// These are NOT role-based checks (admin/superadmin) - those are handled by middleware

export const isProjectOwner = async (userId, projectId) => {
  const project = await prisma.projects.findUnique({
    where: { project_id: Number(projectId) }
  });
  return project?.owner_id === userId;
};

export const isProjectMember = async (userId, projectId) => {
  const member = await prisma.project_members.findFirst({
    where: {
      project_id: Number(projectId),
      user_id: userId
    }
  });
  return !!member;
};

export const hasTaskAccess = async (user, task) => {
  if (!user || !task?.project_id) return false;
  
  const project = await prisma.projects.findUnique({
    where: { project_id: Number(task.project_id) }
  });

  if (!project) return false;

  if (project.owner_id === user.userId) return true;

  const member = await isProjectMember(user.userId, task.project_id);

  return !!member;
};

export const isSelf = (user, targetUserId) => {
  return user?.userId === targetUserId;
}; 