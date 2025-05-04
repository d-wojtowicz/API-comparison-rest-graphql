import prisma from '../../db/client.js';
import bcrypt from 'bcryptjs';
import { signToken } from '../../utils/jwt.js';
import log from '../../config/logging.js';
import CONFIG from '../../config/config.js';

const NAMESPACE =
  CONFIG.server.env == 'PROD' ? 'USER-RESOLVER' : 'graphql/resolvers/user.resolvers.js';
export const userResolvers = {
  Query: {
    getUser: async (_, { id }) => {
      return prisma.user.findUnique({ where: { user_id: Number(id) } });
    },
    allUsers: async () => {
      return prisma.user.findMany();
    },
  },
  Mutation: {
    createUser: async (_, { username, email, password, role }) => {
      const password_hash = await bcrypt.hash(password, 10);
      return prisma.user.create({
        data: { username, email, password_hash, role: role || 'user' },
      });
    },
    login: async (_, { username, password }) => {
      const user = await prisma.user.findUnique({ where: { username } });
      if (!user) {
        log.error(NAMESPACE, `User ${username} not found`);
        throw new Error(`User ${username} not found`);
      }
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        log.error(NAMESPACE, 'Invalid password');
        throw new Error('Invalid password');
      }
      return signToken({ user_id: user.user_id, username: user.username, role: user.role });
    },
  },
};
