import { gql } from 'graphql-tag';

export const userTypeDefs = gql`
  # User type with field-level permissions
  type User {
    user_id: ID!
    username: String!
    email: String!
    role: String! @auth(requires: ADMIN)
    created_at: DateTime! @auth(requires: ADMIN)
    updated_at: DateTime! @auth(requires: ADMIN)
    password_hash: String! @auth(requires: SUPERADMIN)

    # Relationship fields
    projects: [Project!]!
    memberOf: [ProjectMember!]!
    #tasks: [Task!]!
    #notifications: [Notification!]!
    #comments: [TaskComment!]!
  }

  # Input types
  input RegisterInput {
    username: String!
    email: String!
    password: String!
  }

  input LoginInput {
    login: String!
    password: String!
  }

  input ChangePasswordInput {
    oldPassword: String!
    newPassword: String!
  }

  # Authentication types
  type AuthPayload {
    user: User!
    accessToken: String! @auth(requires: SUPERADMIN)
  }

  # Queries
  extend type Query {
    me: User @auth
    user(id: ID!): User
    users: [User!]!
  }

  # Mutations
  extend type Mutation {
    # Public mutations
    register(input: RegisterInput!): User!
    login(input: LoginInput!): AuthPayload!
    changePassword(input: ChangePasswordInput!): Boolean! @auth

    # Admin only mutations
    updateUserRole(id: ID!, role: String!): User! @auth(requires: ADMIN)
    deleteUser(id: ID!): Boolean! @auth(requires: ADMIN)
  }
`;
