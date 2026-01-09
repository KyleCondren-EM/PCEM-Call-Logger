import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

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
		const limit = parseInt(searchParams.get('limit') || '50');
		const action = searchParams.get('action');
		const userId = searchParams.get('userId');

		const where: Record<string, unknown> = {};
		if (action) where.action = action;
		if (userId) where.userId = userId;

		const activities = await prisma.activityLog.findMany({
			where,
			take: Math.min(limit, 100), // Max 100
			orderBy: { createdAt: 'desc' },
		});

		// Get user names for display
		const userIds = [...new Set(activities.map((a) => a.userId).filter(Boolean))] as string[];
		const users = await prisma.user.findMany({
			where: { id: { in: userIds } },
			select: { id: true, name: true, username: true },
		});
		const userMap = new Map(users.map((u) => [u.id, u]));

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
