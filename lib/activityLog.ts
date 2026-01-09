import { query } from './db';

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

export interface ActivityLog {
	id: string;
	action: string;
	description: string;
	userId: string | null;
	targetId: string | null;
	targetType: string | null;
	ipAddress: string | null;
	userAgent: string | null;
	metadata: string | null;
	createdAt: Date;
}

function generateUUID(): string {
	return crypto.randomUUID();
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
		const id = generateUUID();
		await query(
			`INSERT INTO "ActivityLog" (id, action, description, "userId", "targetId", "targetType", "ipAddress", "userAgent", metadata, "createdAt")
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
			[
				id,
				action,
				description,
				userId || null,
				targetId || null,
				targetType || null,
				ipAddress || null,
				userAgent || null,
				metadata ? JSON.stringify(metadata) : null,
			]
		);
	} catch (error) {
		console.error('Failed to log activity:', error);
		// Don't throw - activity logging should not break the main flow
	}
}

export async function getRecentActivities(limit: number = 50): Promise<ActivityLog[]> {
	return query<ActivityLog>(
		`SELECT * FROM "ActivityLog" ORDER BY "createdAt" DESC LIMIT $1`,
		[limit]
	);
}

export async function getActivitiesByUser(userId: string, limit: number = 50): Promise<ActivityLog[]> {
	return query<ActivityLog>(
		`SELECT * FROM "ActivityLog" WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT $2`,
		[userId, limit]
	);
}

export async function getActivitiesByAction(action: ActivityAction, limit: number = 50): Promise<ActivityLog[]> {
	return query<ActivityLog>(
		`SELECT * FROM "ActivityLog" WHERE action = $1 ORDER BY "createdAt" DESC LIMIT $2`,
		[action, limit]
	);
}
