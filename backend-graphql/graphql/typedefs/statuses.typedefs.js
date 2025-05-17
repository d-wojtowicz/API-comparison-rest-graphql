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
    taskStatus(id: ID!): TaskStatus
    taskStatuses: [TaskStatus!]!
  }

  extend type Mutation {
    createStatus(input: CreateStatusInput!): TaskStatus! @auth(requires: SUPERADMIN)
    updateStatus(id: ID!, input: UpdateStatusInput!): TaskStatus! @auth(requires: SUPERADMIN)
    deleteStatus(id: ID!): Boolean! @auth(requires: SUPERADMIN)
  }
`; 