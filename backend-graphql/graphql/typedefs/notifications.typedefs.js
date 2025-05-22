import { gql } from 'graphql-tag';

export const notificationTypeDefs = gql`
  type Notification {
    notification_id: ID!
    user_id: ID!
    message: String!
    is_read: Boolean!
    created_at: DateTime!

    # Relationship fields
    user: User!
  }

  input CreateNotificationInput {
    user_id: ID!
    message: String!
  }

  input UpdateNotificationInput {
    is_read: Boolean
  }

  extend type Query {
    myNotifications: [Notification!]!
    unreadNotificationsCount: Int! @auth
    notification(id: ID!): Notification @auth
  }

  extend type Mutation {
    createNotification(input: CreateNotificationInput!): Notification! @auth(requires: SUPERADMIN)
    updateNotification(id: ID!, input: UpdateNotificationInput!): Notification! @auth
    markAllNotificationsAsRead: Boolean! @auth
    deleteNotification(id: ID!): Boolean! @auth
  }

  extend type Subscription {
    # Subscribe to new notifications for the logged-in user
    notificationCreated: Notification!
    # Subscribe to notification updates (read/unread status changes)
    notificationUpdated: Notification!
  }
`; 