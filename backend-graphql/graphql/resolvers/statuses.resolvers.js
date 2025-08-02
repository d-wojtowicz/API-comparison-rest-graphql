import prisma from '../../db/client.js';
import log from '../../config/logging.js';
import CONFIG from '../../config/config.js';

const NAMESPACE = CONFIG.server.env === 'PROD' ? 'STATUS-RESOLVER' : 'graphql/resolvers/statuses.resolvers.js';

// Helper functions
const isSuperAdmin = (user) => user?.role === 'superadmin';
const isAdmin = (user) => user?.role === 'admin' || isSuperAdmin(user);

export const statusResolvers = {
	Query: {
		taskStatus: async (_, { id }, { user, loaders }) => {
			const status = await loaders.statusLoader.load(Number(id));

			if (!status) {
				log.error(NAMESPACE, 'taskStatus: Status not found');
				throw new Error('Status not found');
			}

			return status;
		},
		taskStatuses: async (_, __, { user, loaders }) => {
			return prisma.task_statuses.findMany();
		}
	},
	Mutation: {
		createStatus: async (_, { input }, { user }) => {
			const { status_name } = input;

			// Check if status with this name already exists
			const existingStatus = await prisma.task_statuses.findUnique({
				where: { status_name }
			});

			if (existingStatus) {
				log.error(NAMESPACE, 'createStatus: Status with this name already exists');
				throw new Error('Status with this name already exists');
			}

			return prisma.task_statuses.create({
				data: {
					status_name
				}
			});
		},
		updateStatus: async (_, { id, input }, { user }) => {
			const status = await prisma.task_statuses.findUnique({
				where: { status_id: Number(id) }
			});

			if (!status) {
				log.error(NAMESPACE, 'updateStatus: Status not found');
				throw new Error('Status not found');
			}

			const { status_name } = input;

			// Check if another status with this name already exists
			const existingStatus = await prisma.task_statuses.findFirst({
				where: {
					status_name,
					NOT: {
						status_id: Number(id)
					}
				}
			});

			if (existingStatus) {
				log.error(NAMESPACE, 'updateStatus: Status with this name already exists');
				throw new Error('Status with this name already exists');
			}

			return prisma.task_statuses.update({
				where: { status_id: Number(id) },
				data: {
					status_name
				}
			});
		},
		deleteStatus: async (_, { id }, { user }) => {
			const status = await prisma.task_statuses.findUnique({
				where: { status_id: Number(id) }
			});

			if (!status) {
				log.error(NAMESPACE, 'deleteStatus: Status not found');
				throw new Error('Status not found');
			}

			// Check if there are any tasks using this status
			const tasksWithStatus = await prisma.tasks.findMany({
				where: { status_id: Number(id) }
			});

			if (tasksWithStatus.length > 0) {
				log.error(NAMESPACE, 'deleteStatus: Cannot delete status that is being used by tasks. Please update or delete the associated tasks first.');
				throw new Error('Cannot delete status that is being used by tasks. Please update or delete the associated tasks first.');
			}

			await prisma.task_statuses.delete({
				where: { status_id: Number(id) }
			});

			return true;
		}
	},
	TaskStatus: {
		tasks: async (parent, _, { user, loaders }) => {
			// For admin/superadmin, return all tasks
			if (isAdmin(user)) {
				return loaders.tasksByStatusLoader.load(parent.status_id);
			}
			
			// For regular users, get tasks and filter by project access
			const tasks = await loaders.tasksByStatusLoader.load(parent.status_id);
			if (!tasks.length) return [];

			// Get all project IDs for these tasks
			const projectIds = [...new Set(tasks.map(task => task.project_id))];
			
			// Batch load all projects and their members at once
			const [projects, projectMembers] = await Promise.all([
				Promise.all(projectIds.map(id => loaders.projectLoader.load(id))),
				Promise.all(projectIds.map(id => loaders.projectMembersByProjectLoader.load(id)))
			]);

			// Create a map of accessible project IDs
			const accessibleProjectIds = new Set(
				projects
					.filter((project, index) => 
						project && (
							project.owner_id === user.userId ||
							projectMembers[index]?.some(member => member.user_id === user.userId)
						)
					)
					.map(project => project.project_id)
			);

			// Return only tasks from accessible projects
			return tasks.filter(task => accessibleProjectIds.has(task.project_id));
		}
	}
};