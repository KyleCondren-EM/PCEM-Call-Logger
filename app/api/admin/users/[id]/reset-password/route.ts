import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { logActivity } from '@/lib/activityLog';
import bcrypt from 'bcryptjs';

// Generate a random temporary password
function generateTempPassword(length: number = 8): string {
	const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
	let result = '';
	for (let i = 0; i < length; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
}

// POST - Reset a user's password (admin only)
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const session = await getSession();
		if (!session) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Only administrators can reset passwords
		if (session.role !== 'ADMINISTRATOR') {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const { id } = await params;

		// Check if user exists
		const user = await prisma.user.findUnique({
			where: { id },
		});

		if (!user) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		// Generate temporary password
		const tempPassword = generateTempPassword();
		const hashedPassword = await bcrypt.hash(tempPassword, 10);

		// Update user with temporary password and flag
		await prisma.user.update({
			where: { id },
			data: {
				password: hashedPassword,
				tempPassword: tempPassword, // Store plaintext for admin to see
				mustResetPassword: true,
				passwordResetRequested: false, // Clear the request flag
				passwordResetRequestedAt: null,
			},
		});

		// Log activity
		await logActivity({
			action: 'PASSWORD_RESET',
			description: `${session.name} reset password for ${user.name} (${user.username})`,
			userId: session.userId as string,
			targetId: user.id,
			targetType: 'USER',
		});

		return NextResponse.json({
			message: 'Password reset successfully',
			tempPassword: tempPassword,
		});
	} catch (error) {
		console.error('Error resetting password:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
