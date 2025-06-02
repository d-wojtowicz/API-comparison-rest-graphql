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

export const CONSTANTS = {
  NOTIFICATIONS,
  SUBSCRIPTION_CHANNEL
};