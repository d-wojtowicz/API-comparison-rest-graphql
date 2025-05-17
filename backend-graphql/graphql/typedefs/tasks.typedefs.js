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
    task(id: ID!): Task
    tasks: [Task!]!
    tasksByProject(projectId: ID!): [Task!]!
    tasksByAssignee(assigneeId: ID!): [Task!]!
    tasksByStatus(statusId: ID!): [Task!]!
  }

  extend type Mutation {
    createTask(input: CreateTaskInput!): Task! @auth
    updateTask(id: ID!, input: UpdateTaskInput!): Task! @auth
    deleteTask(id: ID!): Boolean! @auth(requires: ADMIN)
    assignTask(id: ID!, assigneeId: ID!): Task! @auth
    updateTaskStatus(id: ID!, statusId: ID!): Task! @auth
  }
`; 