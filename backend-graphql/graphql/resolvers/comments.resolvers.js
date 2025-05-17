import prisma from '../../db/client.js';
import log from '../../config/logging.js';
import CONFIG from '../../config/config.js';
import { CONSTANTS } from '../../config/constants.js';
import { notificationService } from '../../services/notification.service.js';

const NAMESPACE = CONFIG.server.env === 'PROD' ? 'COMMENT-RESOLVER' : 'graphql/resolvers/comments.resolvers.js';

// Helper functions
const isCommentAuthor = (user, comment) => user?.userId === comment.user_id;
const isSuperAdmin = (user) => user?.role === 'superadmin';

export const commentResolvers = {
  Query: {
    taskComment: async (_, { id }) => {
      return prisma.task_comments.findUnique({
        where: { comment_id: Number(id) },
        include: {
          tasks: true,
          users: true
        }
      });
    },
    taskComments: async (_, { taskId }) => {
      return prisma.task_comments.findMany({
        where: { task_id: Number(taskId) },
        include: {
          tasks: true,
          users: true
        },
        orderBy: {
          created_at: 'desc'
        }
      });
    }
  },
  Mutation: {
    createTaskComment: async (_, { input }, { user }) => {
      if (!user) {
        log.error(NAMESPACE, 'createTaskComment: User not authenticated');
        throw new Error('Not authenticated');
      }

      const { task_id, comment_text } = input;

      // Check if task exists
      const task = await prisma.tasks.findUnique({
        where: { task_id: Number(task_id) }
      });

      if (!task) {
        log.error(NAMESPACE, 'createTaskComment: Task not found');
        throw new Error('Task not found');
      }

      const comment = await prisma.task_comments.create({
        data: {
          task_id: Number(task_id),
          user_id: user.userId,
          comment_text
        },
        include: {
          tasks: true,
          users: true
        }
      });

      // Get task and user details for notification
      const [taskDetails, commenter] = await Promise.all([
        prisma.tasks.findUnique({
          where: { task_id: Number(task_id) }
        }),
        prisma.users.findUnique({
          where: { user_id: user.userId }
        })
      ]);

      // Notify task assignee about the new comment
      if (taskDetails.assignee_id && taskDetails.assignee_id !== user.userId) {
        await notificationService.createNotification(
          taskDetails.assignee_id,
          CONSTANTS.NOTIFICATIONS.TYPES.TASK.COMMENT_ADDED,
          {
            userName: commenter.username,
            taskName: taskDetails.task_name
          }
        );
      }

      return comment;
    },
    updateTaskComment: async (_, { id, input }, { user }) => {
      if (!user) {
        log.error(NAMESPACE, 'updateTaskComment: User not authenticated');
        throw new Error('Not authenticated');
      }

      const comment = await prisma.task_comments.findUnique({
        where: { comment_id: Number(id) }
      });

      if (!comment) {
        log.error(NAMESPACE, 'updateTaskComment: Comment not found');
        throw new Error('Comment not found');
      }

      if (!isCommentAuthor(user, comment)) {
        log.error(NAMESPACE, 'updateTaskComment: User not authorized to update this comment');
        throw new Error('Not authorized to update this comment');
      }

      const { comment_text } = input;

      return prisma.task_comments.update({
        where: { comment_id: Number(id) },
        data: {
          comment_text,
          updated_at: new Date()
        },
        include: {
          tasks: true,
          users: true
        }
      });
    },
    deleteTaskComment: async (_, { id }, { user }) => {
      if (!user) {
        log.error(NAMESPACE, 'deleteTaskComment: User not authenticated');
        throw new Error('Not authenticated');
      }

      const comment = await prisma.task_comments.findUnique({
        where: { comment_id: Number(id) }
      });

      if (!comment) {
        log.error(NAMESPACE, 'deleteTaskComment: Comment not found');
        throw new Error('Comment not found');
      }

      if (!isCommentAuthor(user, comment) && !isSuperAdmin(user)) {
        log.error(NAMESPACE, 'deleteTaskComment: User not authorized to delete this comment');
        throw new Error('Not authorized to delete this comment');
      }

      await prisma.task_comments.delete({
        where: { comment_id: Number(id) }
      });

      return true;
    }
  },
  TaskComment: {
    task: (parent) => {
      return prisma.tasks.findUnique({
        where: { task_id: parent.task_id }
      });
    },
    user: (parent) => {
      return prisma.users.findUnique({
        where: { user_id: parent.user_id }
      });
    }
  }
}; 