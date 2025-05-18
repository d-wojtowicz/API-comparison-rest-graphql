import prisma from '../../db/client.js';
import log from '../../config/logging.js';
import CONFIG from '../../config/config.js';

const NAMESPACE = CONFIG.server.env === 'PROD' ? 'STATUS-RESOLVER' : 'graphql/resolvers/statuses.resolvers.js';

// Helper functions
const isSuperAdmin = (user) => user?.role === 'superadmin';
const isAdmin = (user) => user?.role === 'admin' || isSuperAdmin(user);
const getUserAccessibleTasks = async (userId) => {
	// Get all projects where user is a member
	const userProjects = await prisma.project_members.findMany({
		where: { user_id: userId },
		select: { project_id: true }
	});

	// Get all projects where user is an owner
	const ownedProjects = await prisma.projects.findMany({
		where: { owner_id: userId },
		select: { project_id: true }
	});

	// Combine project IDs
	const projectIds = [
		...userProjects.map(p => p.project_id),
		...ownedProjects.map(p => p.project_id)
	];

	// Return tasks from these projects
	return prisma.tasks.findMany({
		where: {
			project_id: { in: projectIds }
		}
	});
};

export const statusResolvers = {
	Query: {
		taskStatus: async (_, { id }, { user }) => {
			if (!user) {
				log.error(NAMESPACE, 'taskStatus: User not authenticated');
				throw new Error('Not authenticated');
			}

			// For admin/superadmin, return all data
			if (isAdmin(user)) {
				const status = await prisma.task_statuses.findUnique({
					where: { status_id: Number(id) },
					include: {
						tasks: true
					}
				});

				if (!status) {
					log.error(NAMESPACE, 'taskStatus: Status not found');
					throw new Error('Status not found');
				}

				return status;
			} 
			// For regular users, only return the status with tasks they have access to
			else {
				const status = await prisma.task_statuses.findUnique({
					where: { status_id: Number(id) },
					include: {
						tasks: {
							where: {
								projects: {
									OR: [
										{ owner_id: user.userId },
										{
											project_members: {
												some: { user_id: user.userId }
											}
										}
									]
								}
							}
						}
					}
				});

				if (!status) {
					log.error(NAMESPACE, 'taskStatus: Status not found');
					throw new Error('Status not found');
				}

				return status;
			}
		},
		taskStatuses: async (_, __, { user }) => {
			if (!user) {
				log.error(NAMESPACE, 'taskStatuses: User not authenticated');
				throw new Error('Not authenticated');
			}

			// For admin/superadmin, return all data
			if (isAdmin(user)) {
				const statuses = await prisma.task_statuses.findMany({
					include: {
						tasks: true
					}
				});

				if (!statuses) {
					log.error(NAMESPACE, 'taskStatuses: Statuses not found');
					throw new Error('Statuses not found');
				}

				return statuses;
			}
			// For regular users, only return statuses with tasks they have access to
			else {
				const statuses = await prisma.task_statuses.findMany({
					include: {
						tasks: {
							where: {
								projects: {
									OR: [
										{ owner_id: user.userId },
										{
											project_members: {
												some: { user_id: user.userId }
											}
										}
									]
								}
							}
						}
					}
				});

				if (!statuses) {
					log.error(NAMESPACE, 'taskStatuses: Statuses not found');
					throw new Error('Statuses not found');
				}

				return statuses;
			}
		}
	},
	Mutation: {
		createStatus: async (_, { input }, { user }) => {
			if (!user) {
				log.error(NAMESPACE, 'createStatus: User not authenticated');
				throw new Error('Not authenticated');
			}

			if (!isSuperAdmin(user)) {
				log.error(NAMESPACE, 'createStatus: User not authorized to create statuses');
				throw new Error('Not authorized to create statuses');
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

			if (!isSuperAdmin(user)) {
				log.error(NAMESPACE, 'updateStatus: User not authorized to update statuses');
				throw new Error('Not authorized to update statuses');
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

			if (!isSuperAdmin(user)) {
				log.error(NAMESPACE, 'deleteStatus: User not authorized to delete statuses');
				throw new Error('Not authorized to delete statuses');
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
				log.error(NAMESPACE, 'deleteStatus: Cannot delete status that is being used by tasks. Please update or delete the associated tasks first.');
				throw new Error('Cannot delete status that is being used by tasks. Please update or delete the associated tasks first.');
			}

			await prisma.task_statuses.delete({
				where: { status_id: Number(id) }
			});

			return true;
		}
	}
}