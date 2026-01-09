import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// POST - Change password (for users who must reset)
export async function POST(request: Request) {
	try {
		const session = await getSession();
		if (!session) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const body = await request.json();
		const { newPassword, confirmPassword } = body;

		// Validate passwords match
		if (!newPassword || !confirmPassword) {
			return NextResponse.json({ error: 'Both password fields are required' }, { status: 400 });
		}

		if (newPassword !== confirmPassword) {
			return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 });
		}

		// Validate password strength
		if (newPassword.length < 6) {
			return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
		}

		// Hash new password
		const hashedPassword = await bcrypt.hash(newPassword, 10);

		// Update user password and clear reset flag
		await query(
			`UPDATE "User" SET
				password = $1,
				"mustResetPassword" = false,
				"tempPassword" = NULL,
				"updatedAt" = NOW()
			 WHERE id = $2`,
			[hashedPassword, session.userId]
		);

		return NextResponse.json({ message: 'Password changed successfully' });
	} catch (error) {
		console.error('Error changing password:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
