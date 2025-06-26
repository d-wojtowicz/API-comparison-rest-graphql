import CONFIG from '../../config/config.js';
import log from '../../config/logging.js';
import prisma from '../../db/client.js';
import { hasTaskAccess, isSuperAdmin, isCommentAuthor, isAdmin } from '../utils/permissions.js';

const NAMESPACE = CONFIG.server.env === 'PROD' ? 'COMMENT-SERVICE' : 'rest/services/comments.service.js';

const getCommentById = async (id) => {
  try {
    return await prisma.task_comments.findUnique({
      where: { comment_id: Number(id) }
    });
  } catch (error) {
    log.error(NAMESPACE, `getCommentById: ${error.message}`);
    throw error;
  }
};

const createComment = async (commentData, user) => {
  try {
    const { task_id, comment_text } = commentData;

    // Check if task exists and user has access (admin check is handled by middleware)
    const task = await prisma.tasks.findUnique({
      where: { task_id: Number(task_id) }
    });

    if (!task) {
      log.error(NAMESPACE, `createComment: Task not found`);
      throw new Error('Task not found');
    }

    const hasAccess = await hasTaskAccess(user, task);
    const isAdmin = await isAdmin(user);

    if (!hasAccess && !isAdmin) {
      log.error(NAMESPACE, `createComment: User not authorized to create comments for this task`);
      throw new Error('Not authorized to create comments for this task');
    }

    const comment = await prisma.task_comments.create({
      data: {
        task_id: Number(task_id),
        user_id: user.userId,
        comment_text
      }
    });

    // TODO: Add subscription-similar mechanism for comments (like pubsub in graphql)
    // TODO: Notify the task assignee about the new comment

    return comment;
  } catch (error) {
    log.error(NAMESPACE, `createComment: ${error.message}`);
    throw error;
  }
};

const updateComment = async (id, commentData, user) => {
  try {
    const { comment_text } = commentData;

    const comment = await prisma.task_comments.findUnique({
      where: { comment_id: Number(id) }
    });

    if (!comment) {
      log.error(NAMESPACE, `updateComment: Comment not found`);
      throw new Error('Comment not found');
    }

    // Check if user is the author of the comment (admin check is handled by middleware)
    if (!isCommentAuthor(user.userId, comment) && !isSuperAdmin(user)) {
      log.error(NAMESPACE, `updateComment: User not authorized to update this comment`);
      throw new Error('Not authorized to update this comment');
    }

    return await prisma.task_comments.update({
      where: { comment_id: Number(id) },
      data: { comment_text }
    });
  } catch (error) {
    log.error(NAMESPACE, `updateComment: ${error.message}`);
    throw error;
  }
};

const deleteComment = async (id, user) => {
  try {
    const comment = await prisma.task_comments.findUnique({
      where: { comment_id: Number(id) }
    });

    if (!comment) {
      log.error(NAMESPACE, `deleteComment: Comment not found`);
      throw new Error('Comment not found');
    }

    // Check if user is the author of the comment (admin check is handled by middleware)
    if (!isCommentAuthor(user.userId, comment) && !isAdmin(user)) {
      log.error(NAMESPACE, `deleteComment: User not authorized to delete this comment`);
      throw new Error('Not authorized to delete this comment');
    }

    await prisma.task_comments.delete({
      where: { comment_id: Number(id) }
    });

    return true;
  } catch (error) {
    log.error(NAMESPACE, `deleteComment: ${error.message}`);
    throw error;
  }
};

export default {
  getCommentById,
  createComment,
  updateComment,
  deleteComment
}; 