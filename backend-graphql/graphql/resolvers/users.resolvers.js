import prisma from '../../db/client.js';
import bcrypt from 'bcryptjs';
import { signToken, verifyToken } from '../../utils/jwt.js';
import log from '../../config/logging.js';
import CONFIG from '../../config/config.js';

const NAMESPACE = CONFIG.server.env == 'PROD' ? 'USER-RESOLVER' : 'graphql/resolvers/users.resolvers.js';

// Helper functions
const isSelf = (user, targetUserId) => user?.userId === targetUserId;
const isAdmin = (user) => user?.role === 'admin' || user?.role === 'superadmin';
const isSuperAdmin = (user) => user?.role === 'superadmin';

export const userResolvers = {
  Query: {
    me: async (_, __, { user }) => {
      if (!user) {
        log.error(NAMESPACE, 'me: User not authenticated');
        throw new Error('Not authenticated');
      }
      return prisma.users.findUnique({ where: { user_id: user.userId } });
    },
    user: async (_, { id }) => {
      return prisma.users.findUnique({ 
        where: { user_id: Number(id) }
      });
    },
    users: async () => {
      return prisma.users.findMany();
    },
  },
  Mutation: {
    register: async (_, { input }) => {
      const { username, email, password } = input;
      
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
      return prisma.users.create({
        data: { 
          username, 
          email, 
          password_hash, 
          role: 'user' 
        },
      });
    },
    login: async (_, { input }) => {
      const { login, password } = input;
      const user = await prisma.users.findFirst({ 
        where: { 
          OR: [
            // Allow login with email or username
            { email: login },
            { username: login } 
          ]
        }
      });

      if (!user) {
        log.error(NAMESPACE, `login: User with email/username ${login} not found`);
        throw new Error('Invalid credentials');
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        log.error(NAMESPACE, 'login: Invalid password');
        throw new Error('Invalid credentials');
      }

      const { token } = signToken(user);

      return {
        user,
        accessToken: token
      };
    },
    changePassword: async (_, { input }, { user }) => {
      if (!user) {
        log.error(NAMESPACE, 'changePassword: User not authenticated');
        throw new Error('Not authenticated');
      }

      const { oldPassword, newPassword } = input;
      const dbUser = await prisma.users.findUnique({
        where: { user_id: user.userId }
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
        where: { user_id: user.userId },
        data: { 
          password_hash,
          updated_at: new Date()
        }
      });

      log.info(NAMESPACE, 'changePassword: Password updated successfully');
      return true;
    },
    updateUserRole: async (_, { id, role }, { user }) => {
      if (!isAdmin(user)) {
        log.error(NAMESPACE, 'updateUserRole: User not authorized');
        throw new Error('Not authorized');
      }

      const targetUser = await prisma.users.findUnique({
        where: { user_id: Number(id) }
      });

      if (!targetUser) {
        log.error(NAMESPACE, 'updateUserRole: User not found');
        throw new Error('User not found');
      }

      // Prevent modifying self
      if (isSelf(user, targetUser.user_id)) {
        log.error(NAMESPACE, 'updateUserRole: Cannot modify self');
        throw new Error('Cannot modify self');
      }

      // Prevent modifying admin users
      if (isSuperAdmin(targetUser)) {
        log.error(NAMESPACE, 'updateUserRole: Cannot modify superadmin users');
        throw new Error('Cannot modify superadmin users');
      }

      return prisma.users.update({
        where: { user_id: Number(id) },
        data: { 
          role,
          updated_at: new Date()
        }
      });
    },
    deleteUser: async (_, { id }, { user }) => {
      if (!isAdmin(user)) {
        log.error(NAMESPACE, 'deleteUser: User not authorized');
        throw new Error('Not authorized');
      }

      const targetUser = await prisma.users.findUnique({
        where: { user_id: Number(id) }
      });

      if (!targetUser) {
        log.error(NAMESPACE, 'deleteUser: User not found');
        throw new Error('User not found');
      }

      // Prevent deleting admin users
      if (targetUser.role === 'admin') {
        log.error(NAMESPACE, 'deleteUser: Cannot delete admin users');
        throw new Error('Cannot delete admin users');
      }

      await prisma.users.delete({
        where: { user_id: Number(id) }
      });

      return true;
    },
  },
  User: {
    projects: (parent) => {
      return prisma.projects.findMany({
        where: { owner_id: parent.user_id }
      });
    },
    memberOf: (parent) => {
      return prisma.project_members.findMany({
        where: { user_id: parent.user_id },
        include: {
          project: true
        }
      });
    },
    // tasks: (parent) => {
    //   return prisma.tasks.findMany({
    //     where: { assignee_id: parent.user_id }
    //   });
    // },
    // notifications: (parent) => {
    //   return prisma.notifications.findMany({
    //     where: { user_id: parent.user_id }
    //   });
    // },
    // comments: (parent) => {
    //   return prisma.task_comments.findMany({
    //     where: { user_id: parent.user_id }
    //   });
    // }
  }
};
