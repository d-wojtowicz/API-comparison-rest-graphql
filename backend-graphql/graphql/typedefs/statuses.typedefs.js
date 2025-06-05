import { gql } from 'graphql-tag';

export const statusTypeDefs = gql`
  type TaskStatus {
    status_id: ID!
    status_name: String!
    tasks: [Task!]!
  }

  input CreateStatusInput {
    status_name: String!
  }

  input UpdateStatusInput {
    status_name: String!
  }

  extend type Query {
    taskStatus(id: ID!): TaskStatus @auth
    taskStatuses: [TaskStatus!]! @auth(requires: ADMIN)
  }

  extend type Mutation {
    createStatus(input: CreateStatusInput!): TaskStatus! @auth(requires: SUPERADMIN) @rateLimit(max: 5, window: 300)
    updateStatus(id: ID!, input: UpdateStatusInput!): TaskStatus! @auth(requires: SUPERADMIN) @rateLimit(max: 10, window: 300)
    deleteStatus(id: ID!): Boolean! @auth(requires: SUPERADMIN) @rateLimit(max: 5, window: 300)
  }
`; 