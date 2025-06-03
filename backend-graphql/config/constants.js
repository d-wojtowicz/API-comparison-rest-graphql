// Notification section
const NOTIFICATIONS = {
  // Subscription channels
  CREATED: 'NOTIFICATION_CREATED',
  UPDATED: 'NOTIFICATION_UPDATED',

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
const SUBSCRIPTION_CHANNEL = ({ CHANNEL, USER_ID }) => `${CHANNEL}-${USER_ID}`;

// Complexity section
// Base complexity costs for different field types
const COMPLEXITY = {
  // Basic scalar fields
  SCALAR: 1,
  // Object fields with relationships
  OBJECT: 2,
  // List fields (multiply by expected size)
  LIST: 5,
  // Nested fields (multiply by depth)
  NESTED: 3,
  // Maximum allowed complexity
  MAX: 250,
  // Maximum allowed depth
  MAX_DEPTH: 5
};

// Field complexity configuration
const FIELD_COMPLEXITY = {
  // User fields
  User: {
    user_id: COMPLEXITY.SCALAR,
    username: COMPLEXITY.SCALAR,
    email: COMPLEXITY.SCALAR,
    password_hash: COMPLEXITY.SCALAR,
    created_at: COMPLEXITY.SCALAR,
    updated_at: COMPLEXITY.SCALAR,
    role: COMPLEXITY.SCALAR,
    notifications: COMPLEXITY.LIST,
    project_members: COMPLEXITY.LIST,
    projects: COMPLEXITY.LIST,
    task_comments: COMPLEXITY.LIST,
    tasks: COMPLEXITY.LIST
  },

  // Project fields
  Project: {
    project_id: COMPLEXITY.SCALAR,
    project_name: COMPLEXITY.SCALAR,
    description: COMPLEXITY.SCALAR,
    created_at: COMPLEXITY.SCALAR,
    updated_at: COMPLEXITY.SCALAR,
    owner_id: COMPLEXITY.SCALAR,
    project_members: COMPLEXITY.LIST,
    users: COMPLEXITY.OBJECT,
    tasks: COMPLEXITY.LIST
  },

  // Task fields
  Task: {
    task_id: COMPLEXITY.SCALAR,
    task_name: COMPLEXITY.SCALAR,
    description: COMPLEXITY.SCALAR,
    created_at: COMPLEXITY.SCALAR,
    updated_at: COMPLEXITY.SCALAR,
    due_date: COMPLEXITY.SCALAR,
    priority: COMPLEXITY.SCALAR,
    status_id: COMPLEXITY.SCALAR,
    project_id: COMPLEXITY.SCALAR,
    assignee_id: COMPLEXITY.SCALAR,
    search_vector: COMPLEXITY.SCALAR,
    task_attachments: COMPLEXITY.LIST,
    task_comments: COMPLEXITY.LIST,
    users: COMPLEXITY.OBJECT,
    projects: COMPLEXITY.OBJECT,
    task_statuses: COMPLEXITY.OBJECT
  },

  // TaskStatus fields
  TaskStatus: {
    status_id: COMPLEXITY.SCALAR,
    status_name: COMPLEXITY.SCALAR,
    tasks: COMPLEXITY.LIST
  },

  // TaskComment fields
  TaskComment: {
    comment_id: COMPLEXITY.SCALAR,
    task_id: COMPLEXITY.SCALAR,
    user_id: COMPLEXITY.SCALAR,
    comment_text: COMPLEXITY.SCALAR,
    created_at: COMPLEXITY.SCALAR,
    search_vector: COMPLEXITY.SCALAR,
    tasks: COMPLEXITY.OBJECT,
    users: COMPLEXITY.OBJECT
  },

  // TaskAttachment fields
  TaskAttachment: {
    attachment_id: COMPLEXITY.SCALAR,
    task_id: COMPLEXITY.SCALAR,
    file_path: COMPLEXITY.SCALAR,
    uploaded_at: COMPLEXITY.SCALAR,
    tasks: COMPLEXITY.OBJECT
  },

  // Notification fields
  Notification: {
    notification_id: COMPLEXITY.SCALAR,
    user_id: COMPLEXITY.SCALAR,
    message: COMPLEXITY.SCALAR,
    is_read: COMPLEXITY.SCALAR,
    created_at: COMPLEXITY.SCALAR,
    users: COMPLEXITY.OBJECT
  },

  // ProjectMember fields
  ProjectMember: {
    project_id: COMPLEXITY.SCALAR,
    user_id: COMPLEXITY.SCALAR,
    role: COMPLEXITY.SCALAR,
    projects: COMPLEXITY.OBJECT,
    users: COMPLEXITY.OBJECT
  }
};

const FIELD_TYPE_MAP = {
  // Query fields
  user: 'User',
  users: 'User',
  project: 'Project',
  projects: 'Project',
  task: 'Task',
  tasks: 'Task',
  taskStatus: 'TaskStatus',
  taskStatuses: 'TaskStatus',
  taskComment: 'TaskComment',
  taskComments: 'TaskComment',
  taskAttachment: 'TaskAttachment',
  taskAttachments: 'TaskAttachment',
  notification: 'Notification',
  notifications: 'Notification',
  projectMember: 'ProjectMember',
  projectMembers: 'ProjectMember',
  
  // Nested fields
  user_id: 'User',
  project_id: 'Project',
  task_id: 'Task',
  status_id: 'TaskStatus',
  comment_id: 'TaskComment',
  attachment_id: 'TaskAttachment',
  notification_id: 'Notification',
  
  // Relationship fields
  users: 'User',
  projects: 'Project',
  tasks: 'Task',
  task_statuses: 'TaskStatus',
  task_comments: 'TaskComment',
  task_attachments: 'TaskAttachment',
  notifications: 'Notification',
  project_members: 'ProjectMember'
};

export const CONSTANTS = {
  // Notification section
  NOTIFICATIONS,
  SUBSCRIPTION_CHANNEL,
  // Complexity section
  COMPLEXITY,
  FIELD_COMPLEXITY,
  FIELD_TYPE_MAP
};