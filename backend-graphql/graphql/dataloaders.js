import DataLoader from 'dataloader';
import prisma from '../db/client.js';

// Universal loader factory for one-to-one relationships
const createLoader = (model, idField) => {
  return new DataLoader(async (ids) => {
    const items = await prisma[model].findMany({
      where: {
        [idField]: {
          in: ids.map(id => Number(id))
        }
      }
    });

    const itemMap = items.reduce((map, item) => {
      map[item[idField]] = item;
      return map;
    }, {});

    return ids.map(id => itemMap[id] || null);
  });
};

// Batch loader factory for one-to-many relationships
const createBatchLoader = (model, foreignKey) => {
  return new DataLoader(async (ids) => {
    const items = await prisma[model].findMany({
      where: {
        [foreignKey]: {
          in: ids.map(id => Number(id))
        }
      }
    });

    const itemMap = items.reduce((map, item) => {
      if (!map[item[foreignKey]]) {
        map[item[foreignKey]] = [];
      }
      map[item[foreignKey]].push(item);
      return map;
    }, {});

    return ids.map(id => itemMap[id] || []);
  });
};

// Custom loaders
const createTasksWithProjectAccessLoader = (userId) => {
  return new DataLoader(async (taskIds) => {
    const tasks = await prisma.tasks.findMany({
      where: {
        task_id: { in: taskIds.map(id => Number(id)) },
      projects: {
        OR: [
          { owner_id: userId },
          {
            project_members: {
              some: { user_id: userId }
            }
          }
        ]
      }
    }
  });

  const taskMap = tasks.reduce((map, task) => {
    map[task.task_id] = task;
    return map;
  }, {});

    return taskIds.map(id => taskMap[id] || null);
  });
}

// Create all loaders using the factory
export const createLoaders = () => ({
  // One-to-one relationships
  attachmentLoader: createLoader('task_attachments', 'attachment_id'),
  commentLoader: createLoader('comments', 'comment_id'),
  notificationLoader: createLoader('notifications', 'notification_id'),
  projectLoader: createLoader('projects', 'project_id'),
  statusLoader: createLoader('statuses', 'status_id'),
  taskLoader: createLoader('tasks', 'task_id'),
  userLoader: createLoader('users', 'user_id'),

  // One-to-many relationships
  taskCommentsLoader: createBatchLoader('task_comments', 'task_id'),
  taskAttachmentsLoader: createBatchLoader('task_attachments', 'task_id'),
  tasksByStatusLoader: createBatchLoader('tasks', 'status_id'),
  tasksByProjectLoader: createBatchLoader('tasks', 'project_id'),
  tasksByAssigneeLoader: createBatchLoader('tasks', 'assignee_id'),
  projectMembersByProjectLoader: createBatchLoader('project_members', 'project_id'),
  projectMembersByUserLoader: createBatchLoader('project_members', 'user_id'),
  projectsByUserLoader: createBatchLoader('projects', 'owner_id'),
  notificationsByUserLoader: createBatchLoader('notifications', 'user_id'),
  myProjectsLoader: createBatchLoader('projects', 'owner_id'),
  myNotificationsLoader: createBatchLoader('notifications', 'user_id'),

  // Custom loaders
  tasksWithProjectAccessLoader: createTasksWithProjectAccessLoader
}); 