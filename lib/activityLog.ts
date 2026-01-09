import { prisma } from './prisma';

export type ActivityAction =
	| 'LOGIN'
	| 'LOGOUT'
	| 'REGISTER'
	| 'CALL_CREATED'
	| 'CALL_UPDATED'
	| 'CALL_DELETED'
	| 'USER_APPROVED'
	| 'USER_ROLE_CHANGED'
	| 'USER_DELETED'
	| 'PASSWORD_RESET'
	| 'PASSWORD_RESET_REQUESTED'
	| 'PASSWORD_CHANGED'
	| 'PROFILE_UPDATED';

interface LogActivityParams {
	action: ActivityAction;
	description: string;
	userId?: string;
	targetId?: string;
	targetType?: 'USER' | 'CALL';
	ipAddress?: string;
	userAgent?: string;
	metadata?: Record<string, unknown>;
}

export async function logActivity({
	action,
	description,
	userId,
	targetId,
	targetType,
	ipAddress,
	userAgent,
	metadata,
}: LogActivityParams): Promise<void> {
	try {
		await prisma.activityLog.create({
			data: {
				action,
				description,
				userId,
				targetId,
				targetType,
				ipAddress,
				userAgent,
				metadata: metadata ? JSON.stringify(metadata) : null,
			},
		});
	} catch (error) {
		console.error('Failed to log activity:', error);
		// Don't throw - activity logging should not break the main flow
	}
}

export async function getRecentActivities(limit: number = 50) {
	return prisma.activityLog.findMany({
		take: limit,
		orderBy: { createdAt: 'desc' },
	});
}

export async function getActivitiesByUser(userId: string, limit: number = 50) {
	return prisma.activityLog.findMany({
		where: { userId },
		take: limit,
		orderBy: { createdAt: 'desc' },
	});
}

export async function getActivitiesByAction(action: ActivityAction, limit: number = 50) {
	return prisma.activityLog.findMany({
		where: { action },
		take: limit,
		orderBy: { createdAt: 'desc' },
	});
}
