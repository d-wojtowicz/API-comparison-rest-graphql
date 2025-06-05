import { gql } from 'graphql-tag';

export const commentTypeDefs = gql`
  type TaskComment {
    comment_id: ID!
    task_id: ID!
    user_id: ID!
    comment_text: String!
    created_at: DateTime!
    
    # Relationship fields
    task: Task!
    user: User!
  }

  input CreateTaskCommentInput {
    task_id: ID!
    comment_text: String!
  }

  input UpdateTaskCommentInput {
    comment_text: String!
  }

  extend type Query {
    taskComment(id: ID!): TaskComment @auth
    taskComments(taskId: ID!): [TaskComment!]! @auth
  }

  extend type Mutation {
    createTaskComment(input: CreateTaskCommentInput!): TaskComment! @auth @rateLimit(max: 30, window: 60) # 30 comments per minute
    updateTaskComment(id: ID!, input: UpdateTaskCommentInput!): TaskComment! @auth @rateLimit(max: 20, window: 60) # 20 updates per minute
    deleteTaskComment(id: ID!): Boolean! @auth @rateLimit(max: 10, window: 60) # 10 deletions per minute
  }
`; 