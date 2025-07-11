# GraphQL Cursor-Based Pagination Examples

This document provides examples of how to use the cursor-based pagination implemented in the GraphQL API.

## Overview

The GraphQL API now supports cursor-based pagination for endpoints that return large lists of data. This includes:

### Main Query Pagination
- `users` query (admin only)
- `projects` query (admin only)
- `myProjects` query (paginated)
- `myProjectsList` query (non-paginated, uses DataLoader)
- `tasksByProject` query (paginated)
- `tasksByProjectList` query (non-paginated, uses DataLoader)
- `tasksByAssignee` query (paginated)
- `tasksByAssigneeList` query (non-paginated, uses DataLoader)
- `myNotifications` query (paginated)
- `myNotificationsList` query (non-paginated, uses DataLoader)

### Nested List Pagination
- `Project.members` field (paginated)
- `Project.tasks` field (paginated)
- `Task.comments` field (paginated)
- `Task.attachments` field (paginated)
- `User.projects` field (paginated)
- `User.memberOf` field (paginated)
- `User.tasks` field (paginated)
- `User.notifications` field (paginated)
- `User.comments` field (paginated)

## Pagination Input

All paginated queries accept a `PaginationInput` with the following fields:

```graphql
input PaginationInput {
  cursor: String    # Cursor for the next page (optional)
  limit: Int        # Number of items per page (optional, default: 20, max: 100)
}
```

## Pagination Response

All paginated queries return a connection object with the following structure:

```graphql
type PageInfo {
  hasNextPage: Boolean!  # Whether there are more items
  nextCursor: String     # Cursor for the next page (null if no more pages)
  limit: Int!           # Number of items per page
}
```

## Connection Types

The API provides specific connection types for each paginated relationship:

```graphql
type ProjectsConnection {
  data: [Project!]!
  pagination: PageInfo!
}

type TasksConnection {
  data: [Task!]!
  pagination: PageInfo!
}

type ProjectMembersConnection {
  data: [ProjectMember!]!
  pagination: PageInfo!
}

type TaskCommentsConnection {
  data: [TaskComment!]!
  pagination: PageInfo!
}

type TaskAttachmentsConnection {
  data: [TaskAttachment!]!
  pagination: PageInfo!
}

type NotificationsConnection {
  data: [Notification!]!
  pagination: PageInfo!
}

type UserProjectsConnection {
  data: [Project!]!
  pagination: PageInfo!
}

type UserProjectMembersConnection {
  data: [ProjectMember!]!
  pagination: PageInfo!
}

type UserTasksConnection {
  data: [Task!]!
  pagination: PageInfo!
}

type UserNotificationsConnection {
  data: [Notification!]!
  pagination: PageInfo!
}

type UserCommentsConnection {
  data: [TaskComment!]!
  pagination: PageInfo!
}
```

## Examples

### 1. Get All Users (Admin Only)

```graphql
query GetUsers($input: PaginationInput) {
  users(input: $input) {
    data {
      user_id
      username
      email
      role
      created_at
    }
    pagination {
      hasNextPage
      nextCursor
      limit
    }
  }
}
```

Variables:
```json
{
  "input": {
    "limit": 10
  }
}
```

### 2. Get My Projects (Paginated)

```graphql
query GetMyProjects($input: PaginationInput) {
  myProjects(input: $input) {
    data {
      project_id
      project_name
      description
      created_at
      owner_id
    }
    pagination {
      hasNextPage
      nextCursor
      limit
    }
  }
}
```

Variables:
```json
{
  "input": {
    "limit": 5
  }
}
```

### 3. Get My Projects (Non-paginated, uses DataLoader)

```graphql
query GetMyProjectsList {
  myProjectsList {
    project_id
    project_name
    description
    created_at
    owner_id
  }
}
```

### 4. Get Tasks by Project (Paginated)

```graphql
query GetTasksByProject($projectId: ID!, $input: PaginationInput) {
  tasksByProject(projectId: $projectId, input: $input) {
    data {
      task_id
      task_name
      description
      due_date
      priority
      status_id
      assignee_id
    }
    pagination {
      hasNextPage
      nextCursor
      limit
    }
  }
}
```

Variables:
```json
{
  "projectId": "1",
  "input": {
    "limit": 15
  }
}
```

### 5. Get Tasks by Project (Non-paginated, uses DataLoader)

```graphql
query GetTasksByProjectList($projectId: ID!) {
  tasksByProjectList(projectId: $projectId) {
    task_id
    task_name
    description
    due_date
    priority
    status_id
    assignee_id
  }
}
```

### 6. Get Tasks by Assignee (Paginated)

```graphql
query GetTasksByAssignee($assigneeId: ID!, $input: PaginationInput) {
  tasksByAssignee(assigneeId: $assigneeId, input: $input) {
    data {
      task_id
      task_name
      description
      due_date
      priority
      status_id
      project_id
    }
    pagination {
      hasNextPage
      nextCursor
      limit
    }
  }
}
```

Variables:
```json
{
  "assigneeId": "1",
  "input": {
    "limit": 20
  }
}
```

### 7. Get Tasks by Assignee (Non-paginated, uses DataLoader)

```graphql
query GetTasksByAssigneeList($assigneeId: ID!) {
  tasksByAssigneeList(assigneeId: $assigneeId) {
    task_id
    task_name
    description
    due_date
    priority
    status_id
    project_id
  }
}
```

### 8. Get My Notifications (Paginated)

```graphql
query GetMyNotifications($input: PaginationInput) {
  myNotifications(input: $input) {
    data {
      notification_id
      message
      is_read
      created_at
    }
    pagination {
      hasNextPage
      nextCursor
      limit
    }
  }
}
```

Variables:
```json
{
  "input": {
    "limit": 25
  }
}
```

### 9. Get My Notifications (Non-paginated, uses DataLoader)

```graphql
query GetMyNotificationsList {
  myNotificationsList {
    notification_id
    message
    is_read
    created_at
  }
}
```

## Nested List Pagination Examples

### 10. Get Project with Paginated Members

```graphql
query GetProjectWithMembers($projectId: ID!, $membersInput: PaginationInput) {
  project(id: $projectId) {
    project_id
    project_name
    description
    members(input: $membersInput) {
      data {
        user_id
        role
        user {
          username
          email
        }
      }
      pagination {
        hasNextPage
        nextCursor
        limit
      }
    }
  }
}
```

Variables:
```json
{
  "projectId": "1",
  "membersInput": {
    "limit": 10
  }
}
```

### 11. Get Project with Paginated Tasks

```graphql
query GetProjectWithTasks($projectId: ID!, $tasksInput: PaginationInput) {
  project(id: $projectId) {
    project_id
    project_name
    description
    tasks(input: $tasksInput) {
      data {
        task_id
        task_name
        description
        priority
        status_id
        assignee_id
      }
      pagination {
        hasNextPage
        nextCursor
        limit
      }
    }
  }
}
```

Variables:
```json
{
  "projectId": "1",
  "tasksInput": {
    "limit": 15
  }
}
```

### 12. Get Task with Paginated Comments

```graphql
query GetTaskWithComments($taskId: ID!, $commentsInput: PaginationInput) {
  task(id: $taskId) {
    task_id
    task_name
    description
    comments(input: $commentsInput) {
      data {
        comment_id
        comment_text
        created_at
        user {
          username
        }
      }
      pagination {
        hasNextPage
        nextCursor
        limit
      }
    }
  }
}
```

Variables:
```json
{
  "taskId": "1",
  "commentsInput": {
    "limit": 20
  }
}
```

### 13. Get Task with Paginated Attachments

```graphql
query GetTaskWithAttachments($taskId: ID!, $attachmentsInput: PaginationInput) {
  task(id: $taskId) {
    task_id
    task_name
    description
    attachments(input: $attachmentsInput) {
      data {
        attachment_id
        file_path
        uploaded_at
      }
      pagination {
        hasNextPage
        nextCursor
        limit
      }
    }
  }
}
```

Variables:
```json
{
  "taskId": "1",
  "attachmentsInput": {
    "limit": 10
  }
}
```

### 14. Get User with Paginated Projects

```graphql
query GetUserWithProjects($userId: ID!, $projectsInput: PaginationInput) {
  user(id: $userId) {
    user_id
    username
    email
    projects(input: $projectsInput) {
      data {
        project_id
        project_name
        description
        created_at
      }
      pagination {
        hasNextPage
        nextCursor
        limit
      }
    }
  }
}
```

Variables:
```json
{
  "userId": "1",
  "projectsInput": {
    "limit": 5
  }
}
```

### 15. Get User with Paginated Notifications

```graphql
query GetUserWithNotifications($userId: ID!, $notificationsInput: PaginationInput) {
  user(id: $userId) {
    user_id
    username
    email
    notifications(input: $notificationsInput) {
      data {
        notification_id
        message
        is_read
        created_at
      }
      pagination {
        hasNextPage
        nextCursor
        limit
      }
    }
  }
}
```

Variables:
```json
{
  "userId": "1",
  "notificationsInput": {
    "limit": 25
  }
}
```

### 16. Complex Nested Pagination

```graphql
query ComplexNestedPagination(
  $projectId: ID!, 
  $tasksInput: PaginationInput, 
  $commentsInput: PaginationInput
) {
  project(id: $projectId) {
    project_id
    project_name
    tasks(input: $tasksInput) {
      data {
        task_id
        task_name
        description
        comments(input: $commentsInput) {
          data {
            comment_id
            comment_text
            created_at
            user {
              username
            }
          }
          pagination {
            hasNextPage
            nextCursor
            limit
          }
        }
      }
      pagination {
        hasNextPage
        nextCursor
        limit
      }
    }
  }
}
```

Variables:
```json
{
  "projectId": "1",
  "tasksInput": {
    "limit": 10
  },
  "commentsInput": {
    "limit": 5
  }
}
```

## Pagination Flow

### First Page
1. Make a query without a cursor
2. Use the `nextCursor` from the response for the next page

### Subsequent Pages
1. Use the `nextCursor` from the previous response as the `cursor` in the next query
2. Continue until `hasNextPage` is `false`

### Example Flow

```graphql
# First page
query {
  users(input: { limit: 5 }) {
    data { user_id username email }
    pagination { hasNextPage nextCursor limit }
  }
}
```

Response:
```json
{
  "data": {
    "users": {
      "data": [
        { "user_id": "1", "username": "user1", "email": "user1@example.com" },
        { "user_id": "2", "username": "user2", "email": "user2@example.com" },
        { "user_id": "3", "username": "user3", "email": "user3@example.com" },
        { "user_id": "4", "username": "user4", "email": "user4@example.com" },
        { "user_id": "5", "username": "user5", "email": "user5@example.com" }
      ],
      "pagination": {
        "hasNextPage": true,
        "nextCursor": "5",
        "limit": 5
      }
    }
  }
}
```

```graphql
# Second page
query {
  users(input: { cursor: "5", limit: 5 }) {
    data { user_id username email }
    pagination { hasNextPage nextCursor limit }
  }
}
```

Response:
```json
{
  "data": {
    "users": {
      "data": [
        { "user_id": "6", "username": "user6", "email": "user6@example.com" },
        { "user_id": "7", "username": "user7", "email": "user7@example.com" }
      ],
      "pagination": {
        "hasNextPage": false,
        "nextCursor": null,
        "limit": 5
      }
    }
  }
}
```

## When to Use Which Query

### Use Paginated Queries When:
- Fetching large lists of data for display in UI
- Implementing infinite scroll or "Load More" functionality
- Performance is critical with large datasets
- You need to control memory usage
- Working with nested relationships that could have many items

### Use Non-paginated Queries When:
- Fetching data for relationship fields (e.g., `user.projects`)
- You need all data at once for small datasets
- Building GraphQL fragments that expect simple arrays
- Legacy code compatibility
- You want to benefit from DataLoader's batching and caching

## Implementation Details

- **Paginated Queries**: Use direct Prisma queries with cursor-based pagination
- **Non-paginated Queries**: Use DataLoader for efficient batching and caching
- **Nested List Pagination**: All relationship fields now support pagination
- **Cursor-based Pagination**: Uses primary keys as cursors for efficient pagination
- **Configurable Limits**: Default 20 items, maximum 100 items per page
- **Consistent API**: Same pagination pattern across all endpoints and nested fields
- **Authorization**: All paginated nested fields respect user permissions

## Notes

- The cursor is based on the primary key of each entity (e.g., `user_id`, `project_id`, `task_id`, `notification_id`)
- Results are ordered by the primary key in ascending order (except comments and notifications which are ordered by creation date descending)
- The `limit` parameter has a maximum value of 100
- If no `limit` is provided, the default is 20
- The `cursor` field is optional - omit it for the first page
- When `hasNextPage` is `false`, `nextCursor` will be `null`
- DataLoader is used for non-paginated queries to maintain efficient batching
- Nested pagination supports complex queries with multiple levels of pagination
- All paginated fields include proper authorization checks 