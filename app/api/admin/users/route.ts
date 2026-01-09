import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

interface UserWithCallCount {
	id: string;
	username: string;
	name: string;
	role: string;
	approved: boolean;
	approvedAt: Date | null;
	approvedBy: string | null;
	passwordResetRequested: boolean;
	passwordResetRequestedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
	callCount: string;
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

// GET - List all users
export async function GET() {
	try {
		const auth = await requireAdmin();
		if ('error' in auth) {
			return NextResponse.json({ error: auth.error }, { status: auth.status });
		}

		const users = await query<UserWithCallCount>(
			`SELECT u.id, u.username, u.name, u.role, u.approved, u."approvedAt", u."approvedBy",
					u."passwordResetRequested", u."passwordResetRequestedAt", u."createdAt", u."updatedAt",
					COUNT(c.id) as "callCount"
			 FROM "User" u
			 LEFT JOIN "Call" c ON u.id = c."callTakerId"
			 GROUP BY u.id
			 ORDER BY u."createdAt" DESC`
		);

		// Transform to match the original Prisma response format with _count
		const formattedUsers = users.map((user) => ({
			id: user.id,
			username: user.username,
			name: user.name,
			role: user.role,
			approved: user.approved,
			approvedAt: user.approvedAt,
			approvedBy: user.approvedBy,
			passwordResetRequested: user.passwordResetRequested,
			passwordResetRequestedAt: user.passwordResetRequestedAt,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt,
			_count: {
				calls: parseInt(user.callCount, 10),
			},
		}));

		return NextResponse.json(formattedUsers);
	} catch (error) {
		console.error('Error fetching users:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
