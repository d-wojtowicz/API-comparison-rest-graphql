import { gql } from 'graphql-tag';

export const statusTypeDefs = gql`
  type TaskStatus {
    status_id: ID!
    status_name: String!
    tasks: [Task!]!
  }

  input CreateTaskStatusInput {
    status_name: String!
  }

  input UpdateTaskStatusInput {
    status_name: String!
  }

  extend type Query {
    taskStatus(id: ID!): TaskStatus
    taskStatuses: [TaskStatus!]!
  }

  extend type Mutation {
    createTaskStatus(input: CreateTaskStatusInput!): TaskStatus! @auth(requires: SUPERADMIN)
    updateTaskStatus(id: ID!, input: UpdateTaskStatusInput!): TaskStatus! @auth(requires: SUPERADMIN)
    deleteTaskStatus(id: ID!): Boolean! @auth(requires: SUPERADMIN)
  }
`; 