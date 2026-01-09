import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';
import type { ActivityLog } from '@/lib/activityLog';

interface UserBasic {
	id: string;
	name: string;
	username: string;
}

// Helper to check if user is admin
async function requireAdmin() {
	const session = await getSession();
	if (!session) {
		return { error: 'Not authenticated', status: 401 };
	}
	if (session.role !== 'ADMINISTRATOR') {
		return { error: 'Access denied. Administrator privileges required.', status: 403 };
	}
	return { session };
}

// GET - Get activity logs
export async function GET(request: Request) {
	try {
		const auth = await requireAdmin();
		if ('error' in auth) {
			return NextResponse.json({ error: auth.error }, { status: auth.status });
		}

		const { searchParams } = new URL(request.url);
		const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
		const action = searchParams.get('action');
		const userId = searchParams.get('userId');

		// Build WHERE clause
		const conditions: string[] = [];
		const values: unknown[] = [];
		let paramIndex = 1;

		if (action) {
			conditions.push(`action = $${paramIndex++}`);
			values.push(action);
		}
		if (userId) {
			conditions.push(`"userId" = $${paramIndex++}`);
			values.push(userId);
		}

		const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

		const activities = await query<ActivityLog>(
			`SELECT * FROM "ActivityLog" ${whereClause} ORDER BY "createdAt" DESC LIMIT $${paramIndex}`,
			[...values, limit]
		);

		// Get user names for display
		const userIds = [...new Set(activities.map((a) => a.userId).filter(Boolean))] as string[];

		let userMap = new Map<string, UserBasic>();
		if (userIds.length > 0) {
			const users = await query<UserBasic>(
				`SELECT id, name, username FROM "User" WHERE id = ANY($1)`,
				[userIds]
			);
			userMap = new Map(users.map((u) => [u.id, u]));
		}

		const activitiesWithUsers = activities.map((activity) => ({
			...activity,
			user: activity.userId ? userMap.get(activity.userId) || null : null,
		}));

		return NextResponse.json(activitiesWithUsers);
	} catch (error) {
		console.error('Error fetching activity logs:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
