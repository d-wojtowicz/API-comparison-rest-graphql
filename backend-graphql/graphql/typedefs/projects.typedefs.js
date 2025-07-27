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
    owner: User! @defer
    members: [ProjectMember!]! @defer
    tasks: [Task!]! @defer
  }

  # Junction type for many-to-many relationship between Project and User
  type ProjectMember {
    project_id: ID!
    user_id: ID!
    role: String
    
    # Relationship fields to fetch full project and user data
    project: Project! @defer  
    user: User! @defer
  }

  # Paginated projects response
  type ProjectsConnection {
    data: [Project!]!
    pagination: PageInfo!
  }

  # Paginated project members response
  type ProjectMembersConnection {
    data: [ProjectMember!]!
    pagination: PageInfo!
  }

  input CreateProjectInput {
    project_name: String!
    description: String
  }

  input UpdateProjectInput {
    project_name: String
    description: String
    owner_id: Int
  }

  input AddProjectMemberInput {
    project_id: ID!
    user_id: ID!
    role: String
  }

  extend type Query {
    project(id: ID!): Project @auth
    projects(input: PaginationInput): ProjectsConnection! @auth(requires: ADMIN)
    projectsList: [Project!]! @auth(requires: ADMIN)
    myProjects(input: PaginationInput): ProjectsConnection! @auth
    myProjectsList: [Project!]! @auth
    projectMembers(project_id: ID!): [ProjectMember!]! @auth
  }

  extend type Mutation {
    createProject(input: CreateProjectInput!): Project! @auth(requires: ADMIN) @rateLimit(max: 10, window: 300)
    updateProject(id: ID!, input: UpdateProjectInput!): Project! @auth(requires: ADMIN) @rateLimit(max: 20, window: 300)
    deleteProject(id: ID!): Boolean! @auth(requires: ADMIN) @rateLimit(max: 5, window: 300)
    addProjectMember(input: AddProjectMemberInput!): ProjectMember! @auth(requires: ADMIN) @rateLimit(max: 20, window: 300)
    removeProjectMember(project_id: ID!, user_id: ID!): Boolean! @auth(requires: ADMIN) @rateLimit(max: 20, window: 300)
  }
`; 