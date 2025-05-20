import { gql } from 'graphql-tag';

export const projectTypeDefs = gql`
  type Project {
    project_id: ID!
    project_name: String!
    description: String
    created_at: DateTime
    updated_at: DateTime
    owner_id: ID!

    # Relationship fields
    owner: User!
    members: [ProjectMember!]!
    tasks: [Task!]!
  }

  # Junction type for many-to-many relationship between Project and User
  type ProjectMember {
    project_id: ID!
    user_id: ID!
    role: String
    
    # Relationship fields to fetch full project and user data
    project: Project!
    user: User!
  }

  input CreateProjectInput {
    project_name: String!
    description: String
  }

  input UpdateProjectInput {
    project_name: String
    description: String
  }

  input AddProjectMemberInput {
    project_id: ID!
    user_id: ID!
    role: String
  }

  extend type Query {
    project(id: ID!): Project @auth
    projects: [Project!]! @auth(requires: ADMIN)
    myProjects: [Project!]! @auth
    projectMembers(project_id: ID!): [ProjectMember!]! @auth
  }

  extend type Mutation {
    createProject(input: CreateProjectInput!): Project! @auth(requires: ADMIN)
    updateProject(id: ID!, input: UpdateProjectInput!): Project! @auth(requires: ADMIN)
    deleteProject(id: ID!): Boolean! @auth(requires: ADMIN)
    addProjectMember(input: AddProjectMemberInput!): ProjectMember! @auth(requires: ADMIN)
    removeProjectMember(project_id: ID!, user_id: ID!): Boolean! @auth(requires: ADMIN)
  }
`; 