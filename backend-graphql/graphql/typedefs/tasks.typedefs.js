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
    project: Project!
    assignee: User
    comments: [TaskComment!]!
    attachments: [TaskAttachment!]!
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
    tasks: [Task!]! @auth
    tasksByProject(projectId: ID!): [Task!]! @auth
    tasksByAssignee(assigneeId: ID!): [Task!]! @auth
    tasksByStatus(statusId: ID!): [Task!]! @auth
  }

  extend type Mutation {
    createTask(input: CreateTaskInput!): Task! @auth
    updateTask(id: ID!, input: UpdateTaskInput!): Task! @auth
    deleteTask(id: ID!): Boolean! @auth(requires: ADMIN)
    assignTask(id: ID!, assigneeId: ID!): Task! @auth
    updateTaskStatus(id: ID!, statusId: ID!): Task! @auth
  }
`; 