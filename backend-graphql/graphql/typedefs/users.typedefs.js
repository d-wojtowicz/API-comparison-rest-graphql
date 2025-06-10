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
    projects: [Project!]! @defer
    memberOf: [ProjectMember!]! @defer
    tasks: [Task!]! @defer
    notifications: [Notification!]! @defer
    comments: [TaskComment!]! @defer
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
    user(id: ID!): User @auth
    users: [User!]! @auth(requires: ADMIN)
  }

  # Mutations
  extend type Mutation {
    # Public mutations
    register(input: RegisterInput!): User! @rateLimit(max: 5, window: 300) # 5 registrations per 5 minutes
    login(input: LoginInput!): AuthPayload! @rateLimit(max: 10, window: 300) # 10 logins per 5 minutes
    changePassword(input: ChangePasswordInput!): Boolean! @auth @rateLimit(max: 3, window: 300) # 3 password changes per 5 minutes

    # Admin only mutations
    updateUserRole(id: ID!, role: String!): User! @auth(requires: ADMIN) @rateLimit(max: 20, window: 300) # 20 role updates per 5 minutes
    deleteUser(id: ID!): Boolean! @auth(requires: ADMIN) @rateLimit(max: 5, window: 300) # 5 deletions per 5 minutes
  }
`;
