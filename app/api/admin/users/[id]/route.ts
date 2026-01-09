import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { logActivity } from '@/lib/activityLog';
import type { User, Call } from '@/lib/types';

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

// GET - Get single user
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const auth = await requireAdmin();
		if ('error' in auth) {
			return NextResponse.json({ error: auth.error }, { status: auth.status });
		}

		const { id } = await params;

		const user = await queryOne<Omit<User, 'password' | 'tempPassword'>>(
			`SELECT id, username, name, role, approved, "approvedAt", "approvedBy", "createdAt", "updatedAt"
			 FROM "User" WHERE id = $1`,
			[id]
		);

		if (!user) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		// Get last 10 calls
		const calls = await query<Call>(
			`SELECT * FROM "Call" WHERE "callTakerId" = $1 ORDER BY "createdAt" DESC LIMIT 10`,
			[id]
		);

		return NextResponse.json({
			...user,
			calls,
		});
	} catch (error) {
		console.error('Error fetching user:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

// PUT - Update user (approve, change role, etc.)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const auth = await requireAdmin();
		if ('error' in auth) {
			return NextResponse.json({ error: auth.error }, { status: auth.status });
		}

		const { id } = await params;
		const body = await request.json();
		const { name, role, approved } = body;

		// Build update query dynamically
		const updates: string[] = [];
		const values: unknown[] = [];
		let paramIndex = 1;

		if (name !== undefined) {
			updates.push(`name = $${paramIndex++}`);
			values.push(name);
		}
		if (role !== undefined) {
			updates.push(`role = $${paramIndex++}`);
			values.push(role);
		}

		// Handle approval
		if (approved !== undefined) {
			updates.push(`approved = $${paramIndex++}`);
			values.push(approved);
			if (approved) {
				updates.push(`"approvedAt" = $${paramIndex++}`);
				values.push(new Date());
				updates.push(`"approvedBy" = $${paramIndex++}`);
				values.push(auth.session.userId);
			} else {
				updates.push(`"approvedAt" = $${paramIndex++}`);
				values.push(null);
				updates.push(`"approvedBy" = $${paramIndex++}`);
				values.push(null);
			}
		}

		updates.push(`"updatedAt" = $${paramIndex++}`);
		values.push(new Date());
		values.push(id);

		const user = await queryOne<Omit<User, 'password' | 'tempPassword'>>(
			`UPDATE "User" SET ${updates.join(', ')} WHERE id = $${paramIndex}
			 RETURNING id, username, name, role, approved, "approvedAt", "approvedBy", "createdAt", "updatedAt"`,
			values
		);

		if (!user) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		// Log activity based on what was changed
		if (approved === true) {
			await logActivity({
				action: 'USER_APPROVED',
				description: `${auth.session.name} approved user ${user.name} (${user.username})`,
				userId: auth.session.userId as string,
				targetId: user.id,
				targetType: 'USER',
			});
		}
		if (role !== undefined) {
			await logActivity({
				action: 'USER_ROLE_CHANGED',
				description: `${auth.session.name} changed ${user.name}'s role to ${role}`,
				userId: auth.session.userId as string,
				targetId: user.id,
				targetType: 'USER',
			});
		}

		return NextResponse.json(user);
	} catch (error) {
		console.error('Error updating user:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

// DELETE - Delete user
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const auth = await requireAdmin();
		if ('error' in auth) {
			return NextResponse.json({ error: auth.error }, { status: auth.status });
		}

		const { id } = await params;

		// Prevent self-deletion
		if (id === auth.session.userId) {
			return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
		}

		// Get user info before deletion for logging
		const userToDelete = await queryOne<{ name: string; username: string }>(
			`SELECT name, username FROM "User" WHERE id = $1`,
			[id]
		);

		// Delete user's calls first (or reassign them)
		await execute(`DELETE FROM "Call" WHERE "callTakerId" = $1`, [id]);

		await execute(`DELETE FROM "User" WHERE id = $1`, [id]);

		// Log activity
		if (userToDelete) {
			await logActivity({
				action: 'USER_DELETED',
				description: `${auth.session.name} deleted user ${userToDelete.name} (${userToDelete.username})`,
				userId: auth.session.userId as string,
				targetId: id,
				targetType: 'USER',
			});
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Error deleting user:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
