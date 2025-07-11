import CONFIG from '../../../config/config.js';
import log from '../../../config/logging.js';
import prisma from '../../../db/client.js';
import bcrypt from 'bcryptjs';
import { signToken } from '../../../utils/jwt.js';
import { isSuperAdmin, isAdmin, filterUserFields, isSelf } from '../../utils/permissions.js';

const NAMESPACE = CONFIG.server.env === 'PROD' ? 'USER-SERVICE' : 'rest/services/users.service.js';

const getMe = async (userId) => {
  try {
    return await prisma.users.findUnique({
      where: { user_id: userId }
    });
  } catch (error) {
    log.error(NAMESPACE, `getMe: ${error.message}`);
    throw error;
  }
};

const getUserById = async (id, requestingUser) => {
  try {
    const user = await prisma.users.findUnique({
      where: { user_id: Number(id) }
    });
    
    return filterUserFields(user, requestingUser);
  } catch (error) {
    log.error(NAMESPACE, `getUserById: ${error.message}`);
    throw error;
  }
};

const getAllUsers = async (requestingUser) => {
  try {
    const users = await prisma.users.findMany();
    
    return users.map(user => filterUserFields(user, requestingUser));
  } catch (error) {
    log.error(NAMESPACE, `getAllUsers: ${error.message}`);
    throw error;
  }
};

const register = async (userData) => {
  try {
    const { username, email, password } = userData;
    
    // Check if user already exists
    const existingUser = await prisma.users.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    });
    
    if (existingUser) {
      log.error(NAMESPACE, 'register: User with this email or username already exists');
      throw new Error('User with this email or username already exists');
    }

    const password_hash = await bcrypt.hash(password, 10);
    
    const newUser = await prisma.users.create({
      data: { 
        username, 
        email, 
        password_hash, 
        role: 'user' 
      }
    });

    return filterUserFields(newUser, { role: 'user' });
  } catch (error) {
    log.error(NAMESPACE, `register: ${error.message}`);
    throw error;
  }
};

const login = async (loginData) => {
  try {
    const { login, password } = loginData;
    
    const userCredentials = await prisma.users.findFirst({ 
      where: { 
        OR: [
          // Allow login with email or username
          { email: login },
          { username: login } 
        ]
      }
    });

    if (!userCredentials) {
      log.error(NAMESPACE, `login: User with email/username ${login} not found`);
      throw new Error('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, userCredentials.password_hash);
    if (!valid) {
      log.error(NAMESPACE, 'login: Invalid password');
      throw new Error('Invalid credentials');
    }

    const { token } = signToken(userCredentials);

    return {
      user: userCredentials,
      accessToken: token
    };
  } catch (error) {
    log.error(NAMESPACE, `login: ${error.message}`);
    throw error;
  }
};

const changePassword = async (userId, passwordData) => {
  try {
    const { oldPassword, newPassword } = passwordData;
    
    const dbUser = await prisma.users.findUnique({
      where: { user_id: userId }
    });

    if (!dbUser) {
      log.error(NAMESPACE, 'changePassword: User not found in database');
      throw new Error('User not found');
    }

    const valid = await bcrypt.compare(oldPassword, dbUser.password_hash);
    if (!valid) {
      log.error(NAMESPACE, 'changePassword: Invalid current password');
      throw new Error('Invalid current password');
    }

    const password_hash = await bcrypt.hash(newPassword, 10);
    
    await prisma.users.update({
      where: { user_id: userId },
      data: { 
        password_hash,
        updated_at: new Date()
      }
    });

    log.info(NAMESPACE, 'changePassword: Password updated successfully');
    return true;
  } catch (error) {
    log.error(NAMESPACE, `changePassword: ${error.message}`);
    throw error;
  }
};

const updateUserRole = async (id, role, currentUser) => {
  try {
    const targetUser = await prisma.users.findUnique({
      where: { user_id: Number(id) }
    });

    if (!targetUser) {
      log.error(NAMESPACE, 'updateUserRole: User not found in database');
      throw new Error('User not found');
    }

    // Prevent modifying self
    if (currentUser.userId === targetUser.user_id) {
      log.error(NAMESPACE, 'updateUserRole: Cannot modify self');
      throw new Error('Cannot modify self');
    }

    // Prevent modifying admin users
    if (targetUser.role === 'superadmin') {
      log.error(NAMESPACE, 'updateUserRole: Cannot modify superadmin users');
      throw new Error('Cannot modify superadmin users');
    }

    if (role === 'superadmin') {
      log.error(NAMESPACE, 'updateUserRole: Cannot promote to superadmin');
      throw new Error('Cannot promote to superadmin');
    }

    const updatedUser = await prisma.users.update({
      where: { user_id: Number(id) },
      data: { 
        role,
        updated_at: new Date()
      }
    });

    return filterUserFields(updatedUser, currentUser);
  } catch (error) {
    log.error(NAMESPACE, `updateUserRole: ${error.message}`);
    throw error;
  }
};

const deleteUser = async (id, currentUser) => {
  try {
    const targetUser = await prisma.users.findUnique({
      where: { user_id: Number(id) }
    });

    if (!targetUser) {
      log.error(NAMESPACE, 'deleteUser: User not found in database');
      throw new Error('User not found');
    }

    // Prevent deleting admin users
    if (targetUser.role === 'admin' || targetUser.role === 'superadmin') {
      log.error(NAMESPACE, 'deleteUser: Cannot delete admin users');
      throw new Error('Cannot delete admin users');
    }

    if (currentUser.userId === targetUser.user_id) {
      log.error(NAMESPACE, 'deleteUser: Cannot delete self');
      throw new Error('Cannot delete self');
    }

    await prisma.users.delete({
      where: { user_id: Number(id) }
    });

    return true;
  } catch (error) {
    log.error(NAMESPACE, `deleteUser: ${error.message}`);
    throw error;
  }
};

// Dependencies
const getTasksByAssignee = async (assigneeId, user) => {
  try {
    // Users can only view their own assigned tasks unless they're admin (admin check is handled by middleware)
    if (!isSelf(user, Number(assigneeId)) && !isAdmin(user)) {
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

export default {
  getMe,
  getUserById,
  getAllUsers,
  register,
  login,
  changePassword,
  updateUserRole,
  deleteUser,
  // Dependencies
  getTasksByAssignee
}; 