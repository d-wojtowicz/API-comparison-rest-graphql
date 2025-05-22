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
    createTaskComment(input: CreateTaskCommentInput!): TaskComment! @auth
    updateTaskComment(id: ID!, input: UpdateTaskCommentInput!): TaskComment! @auth
    deleteTaskComment(id: ID!): Boolean! @auth
  }
`; 