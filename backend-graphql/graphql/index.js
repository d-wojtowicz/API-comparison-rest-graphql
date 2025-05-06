import { userTypeDefs } from './typedefs/users.typedefs.js';
import { baseTypeDefs } from './typedefs/base.typedefs.js';
import { userResolvers } from './resolvers/users.resolvers.js';
import { mergeTypeDefs, mergeResolvers } from '@graphql-tools/merge';

export const typeDefs = mergeTypeDefs([baseTypeDefs, userTypeDefs]);
export const resolvers = mergeResolvers([userResolvers]);
