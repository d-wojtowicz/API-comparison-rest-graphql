import { gql } from 'graphql-tag';

export const userTypeDefs = gql`
  type Query {
    getUser(id: ID!): User
    allUsers: [User!]!
  }

  type Mutation {
    createUser(username: String!, email: String!, password: String!, role: String): User!
    login(username: String!, password: String!): String!
  }

  type User {
    user_id: ID!
    username: String!
    email: String!
    role: String!
    created_at: String!
    updated_at: String!
  }
`;
