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

// GET - List all users
export async function GET() {
	try {
		const auth = await requireAdmin();
		if ('error' in auth) {
			return NextResponse.json({ error: auth.error }, { status: auth.status });
		}

		const users = await prisma.user.findMany({
			select: {
				id: true,
				username: true,
				name: true,
				role: true,
				approved: true,
				approvedAt: true,
				approvedBy: true,
				passwordResetRequested: true,
				passwordResetRequestedAt: true,
				createdAt: true,
				updatedAt: true,
				_count: {
					select: { calls: true },
				},
			},
			orderBy: { createdAt: 'desc' },
		});

		return NextResponse.json(users);
	} catch (error) {
		console.error('Error fetching users:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
