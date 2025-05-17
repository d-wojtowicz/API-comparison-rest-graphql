import prisma from '../../db/client.js';
import log from '../../config/logging.js';
import CONFIG from '../../config/config.js';

const NAMESPACE = CONFIG.server.env === 'PROD' ? 'STATUS-RESOLVER' : 'graphql/resolvers/statuses.resolvers.js';

export const statusResolvers = {
	Query: {
		taskStatus: async (_, { id }) => {
			return prisma.task_statuses.findUnique({
				where: { status_id: Number(id) },
				include: {
					tasks: true
				}
			});
		},
		taskStatuses: async () => {
			return prisma.task_statuses.findMany({
				include: {
					tasks: true
				}
			});
		}
	},
	Mutation: {
		createStatus: async (_, { input }, { user }) => {
			if (!user) {
				log.error(NAMESPACE, 'createStatus: User not authenticated');
				throw new Error('Not authenticated');
			}

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
				},
				include: {
					tasks: true
				}
			});
		},
		updateStatus: async (_, { id, input }, { user }) => {
			if (!user) {
				log.error(NAMESPACE, 'updateStatus: User not authenticated');
				throw new Error('Not authenticated');
			}

			const status = await prisma.task_statuses.findUnique({
				where: { status_id: Number(id) }
			});

			if (!status) {
				log.error(NAMESPACE, 'updateStatus: Status not found');
				throw new Error('Status not found');
			}

			const { status_name } = input;

			// Check if another status with this name already exists
			const existingStatus = await prisma.task_statuses.findUnique({
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
				},
				include: {
					tasks: true
				}
			});
		},
		deleteStatus: async (_, { id }, { user }) => {
			if (!user) {
				log.error(NAMESPACE, 'deleteStatus: User not authenticated');
				throw new Error('Not authenticated');
			}

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
				log.error(NAMESPACE, 'deleteStatus: Cannot delete status that is being used by tasks');
				throw new Error('Cannot delete status that is being used by tasks');
			}

			await prisma.task_statuses.delete({
				where: { status_id: Number(id) }
			});

			return true;
		}
	}
}; 