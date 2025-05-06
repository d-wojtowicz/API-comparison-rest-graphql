import { gql } from 'graphql-tag';

export const userTypeDefs = gql`
  type User {
    user_id: ID!
    username: String!
    email: String!
    password_hash: String!
    created_at: DateTime
    updated_at: DateTime
    role: String
  }

  input CreateUserInput {
    username: String!
    email: String!
    password: String!
  }

  input UpdateUserInput {
    username: String
    email: String
    password: String
    role: String
  }

  input LoginInput {
    email: String!
    password: String!
  }

  type AuthPayload {
    user: User!
    accessToken: String!
    refreshToken: String
  }

  extend type Query {
    me: User
    user(id: ID!): User
    users: [User!]!
  }

  extend type Mutation {
    createUser(input: CreateUserInput!): User!
    updateUser(id: ID!, input: UpdateUserInput!): User!
    deleteUser(id: ID!): Boolean!
    login(input: LoginInput!): AuthPayload!
  }
`;
