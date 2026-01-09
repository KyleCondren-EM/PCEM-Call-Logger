import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { logActivity } from '@/lib/activityLog';

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

		const user = await prisma.user.findUnique({
			where: { id },
			select: {
				id: true,
				username: true,
				name: true,
				role: true,
				approved: true,
				approvedAt: true,
				approvedBy: true,
				createdAt: true,
				updatedAt: true,
				calls: {
					orderBy: { createdAt: 'desc' },
					take: 10,
				},
			},
		});

		if (!user) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		return NextResponse.json(user);
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

		// Build update data
		const updateData: {
			name?: string;
			role?: 'USER' | 'ADMINISTRATOR';
			approved?: boolean;
			approvedAt?: Date | null;
			approvedBy?: string | null;
		} = {};

		if (name !== undefined) updateData.name = name;
		if (role !== undefined) updateData.role = role;

		// Handle approval
		if (approved !== undefined) {
			updateData.approved = approved;
			if (approved) {
				updateData.approvedAt = new Date();
				updateData.approvedBy = auth.session.userId;
			} else {
				updateData.approvedAt = null;
				updateData.approvedBy = null;
			}
		}

		const user = await prisma.user.update({
			where: { id },
			data: updateData,
			select: {
				id: true,
				username: true,
				name: true,
				role: true,
				approved: true,
				approvedAt: true,
				approvedBy: true,
				createdAt: true,
				updatedAt: true,
			},
		});

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
		const userToDelete = await prisma.user.findUnique({
			where: { id },
			select: { name: true, username: true },
		});

		// Delete user's calls first (or reassign them)
		await prisma.call.deleteMany({
			where: { callTakerId: id },
		});

		await prisma.user.delete({
			where: { id },
		});

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
