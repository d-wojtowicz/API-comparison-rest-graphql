import prisma from '../../db/client.js';
import bcrypt from 'bcryptjs';
import { signToken, verifyToken } from '../../utils/jwt.js';
import log from '../../config/logging.js';
import CONFIG from '../../config/config.js';
import { parsePaginationInput, buildPaginationQuery, createPaginatedResponse } from '../../utils/pagination.js';

const NAMESPACE = CONFIG.server.env == 'PROD' ? 'USER-RESOLVER' : 'graphql/resolvers/users.resolvers.js';

// Helper functions
const isSelf = (user, targetUserId) => user?.userId === targetUserId;
const isSuperAdmin = (user) => user?.role === 'superadmin';
const isAdmin = (user) => user?.role === 'admin' || isSuperAdmin(user);

export const userResolvers = {
  Query: {
    me: async (_, __, { user }) => {
      if (!user) {
        log.error(NAMESPACE, 'me: User not authenticated');
        throw new Error('Not authenticated');
      }
      return prisma.users.findUnique({ where: { user_id: user.userId } });
    },
    user: async (_, { id }, { user, loaders }) => {
      if (!user) {
        log.error(NAMESPACE, 'user: User not authenticated');
        throw new Error('Not authenticated');
      }

      const targetUser = await loaders.userLoader.load(Number(id));

      if (!targetUser) {
        log.error(NAMESPACE, 'user: User not found');
        throw new Error('User not found');
      }

      return targetUser;
    },
    users: async (_, { input }, { user }) => {
      if (!user) {
        log.error(NAMESPACE, 'users: User not authenticated');
        throw new Error('Not authenticated');
      }

      if (!isAdmin(user)) {
        log.error(NAMESPACE, 'users: User not authorized');
        throw new Error('Not authorized');
      }

      const pagination = parsePaginationInput(input, { defaultLimit: 20, maxLimit: 100 });
      const paginationQuery = buildPaginationQuery(pagination, 'user_id');
      
      const users = await prisma.users.findMany({
        ...paginationQuery
      });
      
      return createPaginatedResponse(users, pagination, 'user_id');
    },
  },
  Mutation: {
    register: async (_, { input }, { user }) => {
      if (user) {
        log.error(NAMESPACE, 'register: User already authenticated');
        throw new Error('User already authenticated');
      }

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
    login: async (_, { input }, { user }) => {
      if (user) {
        log.error(NAMESPACE, 'login: User already authenticated');
        throw new Error('User already authenticated');
      }

      const { login, password } = input;
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
    updateUserRole: async (_, { id, role }, { user, loaders }) => {
      if (!isAdmin(user)) {
        log.error(NAMESPACE, 'updateUserRole: User not authorized');
        throw new Error('Not authorized');
      }

      const targetUser = await loaders.userLoader.load(Number(id));

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

      if (role === 'superadmin') {
        log.error(NAMESPACE, 'updateUserRole: Cannot promote to superadmin');
        throw new Error('Cannot promote to superadmin');
      }

      return prisma.users.update({
        where: { user_id: Number(id) },
        data: { 
          role,
          updated_at: new Date()
        }
      });
    },
    deleteUser: async (_, { id }, { user, loaders }) => {
      if (!isAdmin(user)) {
        log.error(NAMESPACE, 'deleteUser: User not authorized');
        throw new Error('Not authorized');
      }

      const targetUser = await loaders.userLoader.load(Number(id));

      if (!targetUser) {
        log.error(NAMESPACE, 'deleteUser: User not found');
        throw new Error('User not found');
      }

      // Prevent deleting admin users
      if (isAdmin(targetUser)) {
        log.error(NAMESPACE, 'deleteUser: Cannot delete admin users');
        throw new Error('Cannot delete admin users');
      }

      if (isSelf(user, targetUser.user_id)) {
        log.error(NAMESPACE, 'deleteUser: Cannot delete self');
        throw new Error('Cannot delete self');
      }

      await prisma.users.delete({
        where: { user_id: Number(id) }
      });

      return true;
    },
  },
  User: {
    memberOf: async (parent, { input }, { user, loaders }) => {
      if (!user) {
        log.error(NAMESPACE, 'User.memberOf: User not authenticated');
        throw new Error('Not authenticated');
      }
      
      // Users can only see their own project memberships unless they're admin
      if (!isAdmin(user) && !isSelf(user, parent.user_id)) {
        log.error(NAMESPACE, 'User.memberOf: Not authorized to view these project memberships');
        throw new Error('Not authorized');
      }

      const pagination = parsePaginationInput(input, { defaultLimit: 20, maxLimit: 100 });
      const paginationQuery = buildPaginationQuery(pagination, 'project_id');
      
      const memberships = await prisma.project_members.findMany({
        where: { user_id: parent.user_id },
        ...paginationQuery
      });
      
      return createPaginatedResponse(memberships, pagination, 'project_id');
    },
    projects: async (parent, { input }, { user, loaders }) => {
      if (!user) {
        log.error(NAMESPACE, 'User.projects: User not authenticated');
        throw new Error('Not authenticated');
      }
      
      // Users can only see their own projects unless they're admin
      if (!isAdmin(user) && !isSelf(user, parent.user_id)) {
        log.error(NAMESPACE, 'User.projects: Not authorized to view these projects');
        throw new Error('Not authorized');
      }

      const pagination = parsePaginationInput(input, { defaultLimit: 20, maxLimit: 100 });
      const paginationQuery = buildPaginationQuery(pagination, 'project_id');
      
      // Get projects where user is owner or member
      const ownedProjects = await prisma.projects.findMany({
        where: { owner_id: parent.user_id },
        ...paginationQuery
      });

      const memberProjects = await prisma.projects.findMany({
        where: {
          project_members: {
            some: {
              user_id: parent.user_id
            }
          }
        },
        ...paginationQuery
      });

      // Combine and remove duplicates
      const allProjects = [...ownedProjects, ...memberProjects];
      const uniqueProjects = allProjects.filter((project, index, self) => 
        index === self.findIndex(p => p.project_id === project.project_id)
      );

      return createPaginatedResponse(uniqueProjects, pagination, 'project_id');
    },
    notifications: async (parent, { input }, { user, loaders }) => {
      if (!user) {
        log.error(NAMESPACE, 'User.notifications: User not authenticated');
        throw new Error('Not authenticated');
      }
      
      // Users can only see their own notifications unless they're admin
      if (!isSuperAdmin(user) && !isSelf(user, parent.user_id)) {
        log.error(NAMESPACE, 'User.notifications: Not authorized to view these notifications');
        throw new Error('Not authorized');
      }

      const pagination = parsePaginationInput(input, { defaultLimit: 20, maxLimit: 100 });
      const paginationQuery = buildPaginationQuery(pagination, 'notification_id');
      
      const notifications = await prisma.notifications.findMany({
        where: { user_id: parent.user_id },
        orderBy: { created_at: 'desc' },
        ...paginationQuery
      });
      
      return createPaginatedResponse(notifications, pagination, 'notification_id');
    },
    tasks: async (parent, { input }, { user, loaders }) => {
      if (!user) {
        log.error(NAMESPACE, 'User.tasks: User not authenticated');
        throw new Error('Not authenticated');
      }
      
      // Users can only see their own tasks unless they're admin
      if (!isAdmin(user) && !isSelf(user, parent.user_id)) {
        log.error(NAMESPACE, 'User.tasks: Not authorized to view these tasks');
        throw new Error('Not authorized');
      }

      const pagination = parsePaginationInput(input, { defaultLimit: 20, maxLimit: 100 });
      const paginationQuery = buildPaginationQuery(pagination, 'task_id');
      
      const tasks = await prisma.tasks.findMany({
        where: { assignee_id: parent.user_id },
        ...paginationQuery
      });
      
      return createPaginatedResponse(tasks, pagination, 'task_id');
    },
    comments: async (parent, { input }, { user, loaders }) => {
      if (!user) {
        log.error(NAMESPACE, 'User.comments: User not authenticated');
        throw new Error('Not authenticated');
      }
      
      // Users can only see their own comments unless they're admin
      if (!isAdmin(user) && !isSelf(user, parent.user_id)) {
        log.error(NAMESPACE, 'User.comments: Not authorized to view these comments');
        throw new Error('Not authorized');
      }

      const pagination = parsePaginationInput(input, { defaultLimit: 20, maxLimit: 100 });
      const paginationQuery = buildPaginationQuery(pagination, 'comment_id');
      
      const comments = await prisma.task_comments.findMany({
        where: { user_id: parent.user_id },
        orderBy: { created_at: 'desc' },
        ...paginationQuery
      });
      
      return createPaginatedResponse(comments, pagination, 'comment_id');
    }
  }
};
