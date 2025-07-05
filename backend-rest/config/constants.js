// Logging section
const STATUS_MESSAGES = {
  INTERNAL_SERVER_ERROR: 'Internal server error'
};

// Notification section
const NOTIFICATIONS = {
  // Notification types
  TYPES: {
    PROJECT: {
      ADDED_AS_MEMBER: 'PROJECT_ADDED_AS_MEMBER',
      REMOVED_AS_MEMBER: 'PROJECT_REMOVED_AS_MEMBER',
      DELETED: 'PROJECT_DELETED',
      UPDATED: 'PROJECT_UPDATED'
    },
    TASK: {
      ASSIGNED: 'TASK_ASSIGNED',
      UNASSIGNED: 'TASK_UNASSIGNED',
      STATUS_CHANGED: 'TASK_STATUS_CHANGED',
      PRIORITY_CHANGED: 'TASK_PRIORITY_CHANGED',
      DUE_DATE_CHANGED: 'TASK_DUE_DATE_CHANGED',
      COMMENT_ADDED: 'TASK_COMMENT_ADDED',
      ATTACHMENT_ADDED: 'TASK_ATTACHMENT_ADDED',
      DELETED: 'TASK_DELETED'
    }
  },

  // Message templates
  MESSAGES: {
    PROJECT: {
      ADDED_AS_MEMBER: 'You have been added to the project "{projectName}"',
      REMOVED_AS_MEMBER: 'You have been removed from the project "{projectName}"',
      DELETED: 'Project "{projectName}" has been deleted',
      UPDATED: 'Project "{projectName}" has been updated'
    },
    TASK: {
      ASSIGNED: 'You have been assigned to the task "{taskName}" in project "{projectName}"',
      UNASSIGNED: 'You have been unassigned from the task "{taskName}" in project "{projectName}"',
      STATUS_CHANGED: 'Status of task "{taskName}" has been changed to "{status}"',
      PRIORITY_CHANGED: 'Priority of task "{taskName}" has been changed to {priority}',
      DUE_DATE_CHANGED: 'Due date of task "{taskName}" has been changed to {dueDate}',
      COMMENT_ADDED: '{userName} added a comment to task "{taskName}"',
      ATTACHMENT_ADDED: '{userName} added an attachment to task "{taskName}"',
      DELETED: 'Task "{taskName}" in project "{projectName}" has been deleted'
    }
  }
};


// Rate limit section
const RATE_LIMITS = {
  DEFAULT: { limit: 100, windowMs: 60 * 1000 }, // Default limit

  // User endpoints
  'POST /api/users/register': { limit: 5, windowMs: 300 * 1000 }, // 5 registrations per 5 minutes (GraphQL: max: 5, window: 300)
  'POST /api/users/login': { limit: 10, windowMs: 300 * 1000 }, // 10 login attempts per 5 minutes (GraphQL: max: 10, window: 300)
  'PUT /api/users/change-password': { limit: 3, windowMs: 300 * 1000 }, // 3 password changes per 5 minutes (GraphQL: max: 3, window: 300)
  'PUT /api/users/:id/role': { limit: 20, windowMs: 300 * 1000 }, // 20 role updates per 5 minutes (GraphQL: max: 20, window: 300)
  'DELETE /api/users/:id': { limit: 5, windowMs: 300 * 1000 }, // 5 user deletions per 5 minutes (GraphQL: max: 5, window: 300)

  // Project endpoints
  'POST /api/projects': { limit: 10, windowMs: 300 * 1000 }, // 10 project creations per 5 minutes (GraphQL: max: 10, window: 300)
  'PUT /api/projects/:id': { limit: 20, windowMs: 300 * 1000 }, // 20 project updates per 5 minutes (GraphQL: max: 20, window: 300)
  'DELETE /api/projects/:id': { limit: 5, windowMs: 300 * 1000 }, // 5 project deletions per 5 minutes (GraphQL: max: 5, window: 300)
  'POST /api/projects/:id/members': { limit: 20, windowMs: 300 * 1000 }, // 20 member additions per 5 minutes (GraphQL: max: 20, window: 300)
  'DELETE /api/projects/:id/members/:userId': { limit: 20, windowMs: 300 * 1000 }, // 20 member removals per 5 minutes (GraphQL: max: 20, window: 300)

  // Task endpoints
  'POST /api/tasks': { limit: 20, windowMs: 60 * 1000 }, // 20 task creations per minute (GraphQL: max: 20, window: 60)
  'PUT /api/tasks/:id': { limit: 30, windowMs: 60 * 1000 }, // 30 task updates per minute (GraphQL: max: 30, window: 60)
  'DELETE /api/tasks/:id': { limit: 10, windowMs: 60 * 1000 }, // 10 task deletions per minute (GraphQL: max: 10, window: 60)
  'PUT /api/tasks/:id/assign': { limit: 20, windowMs: 60 * 1000 }, // 20 task assignments per minute (GraphQL: max: 20, window: 60)
  'PUT /api/tasks/:id/status': { limit: 20, windowMs: 60 * 1000 }, // 20 status updates per minute (GraphQL: max: 20, window: 60)

  // Notification endpoints
  'POST /api/notifications': { limit: 50, windowMs: 60 * 1000 }, // 50 notification creations per minute (GraphQL: max: 50, window: 60)
  'PUT /api/notifications/:id': { limit: 30, windowMs: 60 * 1000 }, // 30 notification updates per minute (GraphQL: max: 30, window: 60)
  'DELETE /api/notifications/:id': { limit: 20, windowMs: 60 * 1000 }, // 20 notification deletions per minute (GraphQL: max: 20, window: 60)
  'PUT /api/notifications/mark-all-read': { limit: 5, windowMs: 60 * 1000 }, // 5 mark all as read per minute (GraphQL: max: 5, window: 60)

  // Comment endpoints
  'POST /api/comments': { limit: 30, windowMs: 60 * 1000 }, // 30 comment creations per minute (GraphQL: max: 30, window: 60)
  'PUT /api/comments/:id': { limit: 20, windowMs: 60 * 1000 }, // 20 comment updates per minute (GraphQL: max: 20, window: 60)
  'DELETE /api/comments/:id': { limit: 10, windowMs: 60 * 1000 }, // 10 comment deletions per minute (GraphQL: max: 10, window: 60)

  // Attachment endpoints
  'POST /api/attachments': { limit: 10, windowMs: 60 * 1000 }, // 10 attachment uploads per minute (GraphQL: max: 10, window: 60)
  'PUT /api/attachments/:id': { limit: 20, windowMs: 60 * 1000 }, // 20 attachment updates per minute (GraphQL: max: 20, window: 60)
  'DELETE /api/attachments/:id': { limit: 10, windowMs: 60 * 1000 }, // 10 attachment deletions per minute (GraphQL: max: 10, window: 60)

  // Status endpoints
  'POST /api/statuses': { limit: 5, windowMs: 300 * 1000 }, // 5 status creations per 5 minutes (GraphQL: max: 5, window: 300)
  'PUT /api/statuses/:id': { limit: 10, windowMs: 300 * 1000 }, // 10 status updates per 5 minutes (GraphQL: max: 10, window: 300)
  'DELETE /api/statuses/:id': { limit: 5, windowMs: 300 * 1000 }, // 5 status deletions per 5 minutes (GraphQL: max: 5, window: 300)

  // Default limits for GET endpoints (more permissive)
  'GET /api/users': { limit: 100, windowMs: 60 * 1000 }, // 100 user list requests per minute
  'GET /api/users/:id': { limit: 200, windowMs: 60 * 1000 }, // 200 user detail requests per minute
  'GET /api/users/me': { limit: 200, windowMs: 60 * 1000 }, // 200 current user requests per minute
  'GET /api/projects': { limit: 150, windowMs: 60 * 1000 }, // 150 project list requests per minute
  'GET /api/projects/my': { limit: 150, windowMs: 60 * 1000 }, // 150 user projects requests per minute
  'GET /api/projects/:id': { limit: 200, windowMs: 60 * 1000 }, // 200 project detail requests per minute
  'GET /api/projects/:id/members': { limit: 200, windowMs: 60 * 1000 }, // 200 project members requests per minute
  'GET /api/projects/:projectId/tasks': { limit: 200, windowMs: 60 * 1000 }, // 200 project tasks requests per minute
  'GET /api/tasks/:id': { limit: 300, windowMs: 60 * 1000 }, // 300 task detail requests per minute
  'GET /api/tasks/:taskId/comments': { limit: 200, windowMs: 60 * 1000 }, // 200 task comments requests per minute
  'GET /api/tasks/:taskId/attachments': { limit: 200, windowMs: 60 * 1000 }, // 200 task attachments requests per minute
  'GET /api/notifications/my': { limit: 100, windowMs: 60 * 1000 }, // 100 notification list requests per minute
  'GET /api/notifications/:id': { limit: 200, windowMs: 60 * 1000 }, // 200 notification detail requests per minute
  'GET /api/notifications/unread-count': { limit: 100, windowMs: 60 * 1000 }, // 100 unread count requests per minute
  'GET /api/comments/:id': { limit: 200, windowMs: 60 * 1000 }, // 200 comment detail requests per minute
  'GET /api/attachments/:id': { limit: 100, windowMs: 60 * 1000 }, // 100 attachment detail requests per minute
  'GET /api/statuses': { limit: 200, windowMs: 60 * 1000 }, // 200 status list requests per minute
  'GET /api/statuses/:id': { limit: 300, windowMs: 60 * 1000 }, // 300 status detail requests per minute
  'GET /api/statuses/:statusId/tasks': { limit: 200, windowMs: 60 * 1000 }, // 200 tasks by status requests per minute
};

export const CONSTANTS = {
  // Logging section
  STATUS_MESSAGES,
  // Notification section
  NOTIFICATIONS,
  // Rate limiting section
  RATE_LIMITS
};