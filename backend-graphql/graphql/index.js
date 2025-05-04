import { userTypeDefs } from './typedefs/user.typedefs.js';
import { userResolvers } from './resolvers/user.resolvers.js';
import { mergeTypeDefs, mergeResolvers } from '@graphql-tools/merge';

export const typeDefs = mergeTypeDefs([userTypeDefs]);
export const resolvers = mergeResolvers([userResolvers]);
