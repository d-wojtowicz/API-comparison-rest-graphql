import prisma from '../../db/client.js';

// ENDPOINT-LEVEL AUTHENTICATION: Helper functions for business logic permissions
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

// FIELD-LEVEL AUTHENTICATION: Helper functions to filter user fields based on role
export const isSuperAdmin = (user) => user?.role === 'superadmin';

export const isAdmin = (user) => user?.role === 'admin' || isSuperAdmin(user);

export const filterUserFields = (userData, requestingUser) => {
  if (!userData) return userData;
  
  // Create a copy to avoid mutating the original object
  const filteredUser = { ...userData };
  
  // Remove password_hash from all responses (security best practice)
  delete filteredUser.password_hash;
  
  // Superadmin can see password_hash
  if (isSuperAdmin(requestingUser)) {
    filteredUser.password_hash = userData.password_hash;
  }
  
  // Admin can see role, created_at, updated_at (but not password_hash unless superadmin)
  if (isAdmin(requestingUser)) {
    filteredUser.role = userData.role;
    filteredUser.created_at = userData.created_at;
    filteredUser.updated_at = userData.updated_at;
  } else {
    // Regular users cannot see role, created_at, updated_at, or password_hash
    delete filteredUser.role;
    delete filteredUser.created_at;
    delete filteredUser.updated_at;
  }
  
  return filteredUser;
};