import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST - Request a password reset (user-initiated, works logged in or with username)
export async function POST(request: Request) {
	try {
		const session = await getSession();
		let userId: string | undefined;

		if (session) {
			// User is logged in, use their session
			userId = session.userId as string;
		} else {
			// User is not logged in, try to get username from request body
			const body = await request.json();
			const { username } = body;

			if (!username) {
				return NextResponse.json({ error: 'Username is required' }, { status: 400 });
			}

			// Find the user by username
			const user = await prisma.user.findUnique({
				where: { username: username.toUpperCase() },
				select: { id: true },
			});

			if (!user) {
				// Don't reveal if user exists or not for security
				return NextResponse.json({ message: 'If the account exists, a reset request has been submitted' });
			}

			userId = user.id;
		}

		// Update the user's password reset request status
		await prisma.user.update({
			where: { id: userId },
			data: {
				passwordResetRequested: true,
				passwordResetRequestedAt: new Date(),
			},
		});

		return NextResponse.json({ message: 'Password reset requested successfully' });
	} catch (error) {
		console.error('Error requesting password reset:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

// DELETE - Cancel password reset request
export async function DELETE() {
	try {
		const session = await getSession();
		if (!session) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Clear the user's password reset request
		await prisma.user.update({
			where: { id: session.userId as string },
			data: {
				passwordResetRequested: false,
				passwordResetRequestedAt: null,
			},
		});

		return NextResponse.json({ message: 'Password reset request cancelled' });
	} catch (error) {
		console.error('Error cancelling password reset request:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
