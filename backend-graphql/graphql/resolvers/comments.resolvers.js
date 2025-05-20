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
    taskComment: async (_, { id }, { user, loaders }) => {
      if (!user) {
        log.error(NAMESPACE, 'taskComment: User not authenticated');
        throw new Error('Not authenticated');
      }

      const comment = await loaders.commentLoader.load(Number(id));

      if (!comment) {
        log.error(NAMESPACE, 'taskComment: Comment not found');
        throw new Error('Comment not found');
      }

      if (!await hasTaskAccess(user, comment.task_id, loaders) && !isAdmin(user)) {
        log.error(NAMESPACE, 'taskComment: User not authorized to view this comment');
        throw new Error('Not authorized to view this comment');
      }

      return comment;
    },
    taskComments: async (_, { taskId }, { user, loaders }) => {
      if (!user) {
        log.error(NAMESPACE, 'taskComments: User not authenticated');
        throw new Error('Not authenticated');
      }

      const taskComments = await loaders.taskCommentsLoader.load(Number(taskId));
      
      if (!await hasTaskAccess(user, taskComments.task_id, loaders) && !isAdmin(user)) {
        log.error(NAMESPACE, 'taskComments: User not authorized to view this task comments');
        throw new Error('Not authorized to view this task comments');
      }

      return taskComments;
    }
  },
  Mutation: {
    createTaskComment: async (_, { input }, { user, loaders }) => {
      if (!user) {
        log.error(NAMESPACE, 'createTaskComment: User not authenticated');
        throw new Error('Not authenticated');
      }

      const { task_id, comment_text } = input;

      // Check if task exists
      const task = await loaders.taskLoader.load(Number(task_id));
      if (!task) {
        log.error(NAMESPACE, 'createTaskComment: Task not found');
        throw new Error('Task not found');
      }

      const comment = await prisma.task_comments.create({
        data: {
          task_id: Number(task_id),
          user_id: user.userId,
          comment_text
        }
      });

      // Get task and user details for notification
      const [taskDetails, commenter] = await Promise.all([
        loaders.taskLoader.load(Number(task_id)),
        loaders.userLoader.load(user.userId)
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
    updateTaskComment: async (_, { id, input }, { user, loaders }) => {
      if (!user) {
        log.error(NAMESPACE, 'updateTaskComment: User not authenticated');
        throw new Error('Not authenticated');
      }

      const comment = await loaders.commentLoader.load(Number(id));
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
        }
      });
    },
    deleteTaskComment: async (_, { id }, { user, loaders }) => {
      if (!user) {
        log.error(NAMESPACE, 'deleteTaskComment: User not authenticated');
        throw new Error('Not authenticated');
      }

      const comment = await loaders.commentLoader.load(Number(id));
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
    task: (parent, _, { loaders }) => {
      return loaders.taskLoader.load(parent.task_id);
    },
    user: (parent, _, { loaders }) => {
      return loaders.userLoader.load(parent.user_id);
    }
  }
}; 