import { mergeTypeDefs, mergeResolvers } from '@graphql-tools/merge';

import { userTypeDefs } from './typedefs/users.typedefs.js';
import { projectTypeDefs } from './typedefs/projects.typedefs.js';
import { baseTypeDefs } from './typedefs/base.typedefs.js';
import { statusTypeDefs } from './typedefs/statuses.typedefs.js';
import { attachmentTypeDefs } from './typedefs/attachments.typedefs.js';
import { userResolvers } from './resolvers/users.resolvers.js';
import { projectResolvers } from './resolvers/projects.resolvers.js';
import { statusResolvers } from './resolvers/statuses.resolvers.js';
import { attachmentResolvers } from './resolvers/attachments.resolvers.js';

export const typeDefs = mergeTypeDefs([
    attachmentTypeDefs,
    baseTypeDefs, 
    projectTypeDefs, 
    statusTypeDefs, 
    userTypeDefs
]);

export const resolvers = mergeResolvers([
    attachmentResolvers,
    projectResolvers, 
    statusResolvers, 
    userResolvers
]);
