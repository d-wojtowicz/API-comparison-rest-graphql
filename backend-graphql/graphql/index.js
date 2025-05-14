import { userTypeDefs } from './typedefs/users.typedefs.js';
import { projectTypeDefs } from './typedefs/projects.typedefs.js';
import { baseTypeDefs } from './typedefs/base.typedefs.js';
import { statusTypeDefs } from './typedefs/statuses.typedefs.js';
import { userResolvers } from './resolvers/users.resolvers.js';
import { projectResolvers } from './resolvers/projects.resolvers.js';
import { statusResolvers } from './resolvers/statuses.resolvers.js';
import { mergeTypeDefs, mergeResolvers } from '@graphql-tools/merge';

export const typeDefs = mergeTypeDefs([baseTypeDefs, userTypeDefs, projectTypeDefs, statusTypeDefs]);
export const resolvers = mergeResolvers([userResolvers, projectResolvers, statusResolvers]);
