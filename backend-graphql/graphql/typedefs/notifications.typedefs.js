import { gql } from 'graphql-tag';

export const notificationTypeDefs = gql`
  type Notification {
    notification_id: ID!
    user_id: ID!
    message: String!
    is_read: Boolean!
    created_at: DateTime!

    # Relationship fields
    user: User! @defer
  }

  input CreateNotificationInput {
    user_id: ID!
    message: String!
  }

  input UpdateNotificationInput {
    is_read: Boolean
  }

  extend type Query {
    myNotifications: [Notification!]! @auth
    unreadNotificationsCount: Int! @auth
    notification(id: ID!): Notification @auth
  }

  extend type Mutation {
    createNotification(input: CreateNotificationInput!): Notification! @auth(requires: SUPERADMIN) @rateLimit(max: 50, window: 60)
    updateNotification(id: ID!, input: UpdateNotificationInput!): Notification! @auth @rateLimit(max: 30, window: 60)
    markAllNotificationsAsRead: Boolean! @auth @rateLimit(max: 5, window: 60)
    deleteNotification(id: ID!): Boolean! @auth @rateLimit(max: 20, window: 60)
  }

  extend type Subscription {
    # Subscribe to new notifications for the logged-in user
    notificationCreated: Notification!
    # Subscribe to notification updates (read/unread status changes)
    notificationUpdated: Notification!
  }
`; 