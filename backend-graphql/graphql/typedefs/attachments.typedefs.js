import { gql } from 'graphql-tag';

export const attachmentTypeDefs = gql`
  type TaskAttachment {
    attachment_id: ID!
    task_id: ID!
    file_path: String!
    uploaded_at: DateTime!

    # Relationship fields
    task: Task! @defer
  }

  input CreateTaskAttachmentInput {
    task_id: ID!
    file_path: String!
  }

  input UpdateTaskAttachmentInput {
    file_path: String!
  }

  extend type Query {
    taskAttachment(id: ID!): TaskAttachment @auth
    taskAttachmentsByTask(taskId: ID!): [TaskAttachment!]! @auth
  }

  extend type Mutation {
    createTaskAttachment(input: CreateTaskAttachmentInput!): TaskAttachment! @auth @rateLimit(max: 10, window: 60)
    updateTaskAttachment(id: ID!, input: UpdateTaskAttachmentInput!): TaskAttachment! @auth @rateLimit(max: 20, window: 60)
    deleteTaskAttachment(id: ID!): Boolean! @auth @rateLimit(max: 10, window: 60)
  }
`; 