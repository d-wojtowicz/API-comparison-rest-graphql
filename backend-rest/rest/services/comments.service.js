import CONFIG from '../../config/config.js';
import log from '../../config/logging.js';
import prisma from '../../db/client.js';

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

const createComment = async (commentData, userId) => {
  try {
    const { task_id, comment_text } = commentData;

    // Check if task exists
    const task = await prisma.tasks.findUnique({
      where: { task_id: Number(task_id) }
    });

    if (!task) {
      throw new Error('Task not found');
    }

    return await prisma.task_comments.create({
      data: {
        task_id: Number(task_id),
        user_id: userId,
        comment_text
      }
    });
  } catch (error) {
    log.error(NAMESPACE, `createComment: ${error.message}`);
    throw error;
  }
};

const updateComment = async (id, commentData, userId) => {
  try {
    const { comment_text } = commentData;

    const comment = await prisma.task_comments.findUnique({
      where: { comment_id: Number(id) }
    });

    if (!comment) {
      throw new Error('Comment not found');
    }

    // Check if user is the author of the comment
    if (comment.user_id !== userId) {
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

const deleteComment = async (id, userId) => {
  try {
    const comment = await prisma.task_comments.findUnique({
      where: { comment_id: Number(id) }
    });

    if (!comment) {
      throw new Error('Comment not found');
    }

    // Check if user is the author of the comment
    if (comment.user_id !== userId) {
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