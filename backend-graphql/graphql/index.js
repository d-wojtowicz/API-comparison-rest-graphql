import { mergeTypeDefs, mergeResolvers } from '@graphql-tools/merge';

import { attachmentResolvers } from './resolvers/attachments.resolvers.js';
import { attachmentTypeDefs } from './typedefs/attachments.typedefs.js';
import { baseTypeDefs } from './typedefs/base.typedefs.js';
import { commentResolvers } from './resolvers/comments.resolvers.js';
import { commentTypeDefs } from './typedefs/comments.typedefs.js';
import { projectResolvers } from './resolvers/projects.resolvers.js';
import { projectTypeDefs } from './typedefs/projects.typedefs.js';
import { statusResolvers } from './resolvers/statuses.resolvers.js';
import { statusTypeDefs } from './typedefs/statuses.typedefs.js';
import { taskResolvers } from './resolvers/tasks.resolvers.js';
import { taskTypeDefs } from './typedefs/tasks.typedefs.js';
import { userResolvers } from './resolvers/users.resolvers.js';
import { userTypeDefs } from './typedefs/users.typedefs.js';

export const typeDefs = mergeTypeDefs([
    attachmentTypeDefs,
    baseTypeDefs,
    commentTypeDefs,
    projectTypeDefs, 
    statusTypeDefs, 
    taskTypeDefs,
    userTypeDefs
]);

export const resolvers = mergeResolvers([
    attachmentResolvers,
    commentResolvers,
    projectResolvers, 
    statusResolvers, 
    taskResolvers,
    userResolvers
]);
