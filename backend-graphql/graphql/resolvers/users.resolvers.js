import prisma from '../../db/client.js';
import bcrypt from 'bcryptjs';
import { signToken } from '../../utils/jwt.js';
import log from '../../config/logging.js';
import CONFIG from '../../config/config.js';

const NAMESPACE =
  CONFIG.server.env == 'PROD' ? 'USER-RESOLVER' : 'graphql/resolvers/user.resolvers.js';

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
      return prisma.users.findUnique({ where: { user_id: Number(id) } });
    },
    users: async (_, { first, after, last, before }) => {
      // TODO: Implement pagination
      return prisma.users.findMany();
    },
  },
  Mutation: {
    createUser: async (_, { input }) => {
      const { username, email, password } = input;
      const password_hash = await bcrypt.hash(password, 10);
      return prisma.users.create({
        data: { username, email, password_hash, role: 'user' },
      });
    },
    updateUser: async (_, { id, input }, { user }) => {
      if (!user) {
        log.error(NAMESPACE, 'updateUser: User not authenticated');
        throw new Error('Not authenticated');
      }
      if (user.userId !== Number(id) && user.role !== 'admin') {
        log.error(NAMESPACE, 'updateUser: User not authorized');
        throw new Error('Not authorized');
      }
      const data = { ...input };
      if (input.password) {
        data.password_hash = await bcrypt.hash(input.password, 10);
        delete data.password;
      }
      return prisma.users.update({
        where: { user_id: Number(id) },
        data,
      });
    },
    deleteUser: async (_, { id }, { user }) => {
      if (!user) {
        log.error(NAMESPACE, 'deleteUser: User not authenticated');
        throw new Error('Not authenticated');
      }
      if (user.userId !== Number(id) && user.role !== 'admin') {
        log.error(NAMESPACE, 'deleteUser: User not authorized');
        throw new Error('Not authorized');
      }
      await prisma.users.delete({
        where: { user_id: Number(id) },
      });
      return true;
    },
    login: async (_, { input }) => {
      const { email, password } = input;
      const user = await prisma.users.findUnique({ where: { email } });
      if (!user) {
        log.error(NAMESPACE, `User with email ${email} not found`);
        throw new Error('Invalid credentials');
      }
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        log.error(NAMESPACE, 'Invalid password');
        throw new Error('Invalid credentials');
      }
      const { token } = signToken(user);
      return {
        user,
        accessToken: token,
        refreshToken: null // We're not using refresh tokens for now
      };
    },
  },
};
