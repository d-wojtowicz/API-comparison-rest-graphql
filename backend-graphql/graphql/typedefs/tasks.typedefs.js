import { gql } from 'graphql-tag';

export const taskTypeDefs = gql`
  type Task {
    task_id: ID!
    task_name: String!
    description: String
    created_at: DateTime!
    updated_at: DateTime!
    due_date: DateTime
    priority: Int
    status_id: ID!
    project_id: ID!
    assignee_id: ID

    # Relationship fields
    status: TaskStatus!
    project: Project! @defer
    assignee: User @defer
    comments(input: PaginationInput): TaskCommentsConnection! @defer
    attachments(input: PaginationInput): TaskAttachmentsConnection! @defer
  }

  # Paginated tasks response
  type TasksConnection {
    data: [Task!]!
    pagination: PageInfo!
  }

  input CreateTaskInput {
    task_name: String!
    description: String
    due_date: DateTime
    priority: Int
    status_id: ID!
    project_id: ID!
    assignee_id: ID
  }

  input UpdateTaskInput {
    task_name: String
    description: String
    due_date: DateTime
    priority: Int
    status_id: Int
    assignee_id: Int
  }

  extend type Query {
    task(id: ID!): Task @auth
    tasksByProject(projectId: ID!, input: PaginationInput): TasksConnection! @auth
    tasksByProjectList(projectId: ID!): [Task!]! @auth
    tasksByAssignee(assigneeId: ID!, input: PaginationInput): TasksConnection! @auth
    tasksByAssigneeList(assigneeId: ID!): [Task!]! @auth
    tasksByStatus(statusId: ID!): [Task!]! @auth
  }

  extend type Mutation {
    createTask(input: CreateTaskInput!): Task! @auth @rateLimit(max: 20, window: 60)
    updateTask(id: ID!, input: UpdateTaskInput!): Task! @auth @rateLimit(max: 30, window: 60)
    deleteTask(id: ID!): Boolean! @auth(requires: ADMIN) @rateLimit(max: 10, window: 60)
    assignTask(id: ID!, assigneeId: ID!): Task! @auth @rateLimit(max: 20, window: 60)
    updateTaskStatus(id: ID!, statusId: ID!): Task! @auth @rateLimit(max: 20, window: 60)
  }
`; 