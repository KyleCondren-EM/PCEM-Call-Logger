import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
	try {
		const { username, password, name } = await request.json();

		if (!username || !password || !name) {
			return NextResponse.json({ error: 'Username, password, and name are required' }, { status: 400 });
		}

		if (password.length < 6) {
			return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
		}

		// Normalize username to uppercase for storage and comparison
		const normalizedUsername = username.toUpperCase().replace(/[^A-Z0-9]/g, '');

		if (normalizedUsername.length < 2) {
			return NextResponse.json({ error: 'Username must be at least 2 characters' }, { status: 400 });
		}

		// Check for existing username (since we normalize to uppercase, direct match works)
		const existingUser = await prisma.user.findUnique({
			where: { username: normalizedUsername },
		});

		if (existingUser) {
			return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
		}

		const hashedPassword = await bcrypt.hash(password, 10);

		// Check if this is the first user - make them an approved administrator
		const userCount = await prisma.user.count();
		const isFirstUser = userCount === 0;

		const user = await prisma.user.create({
			data: {
				username: normalizedUsername,
				password: hashedPassword,
				name,
				role: isFirstUser ? 'ADMINISTRATOR' : 'USER',
				approved: isFirstUser, // First user is auto-approved
				approvedAt: isFirstUser ? new Date() : null,
			},
		});

		// Return pending status for non-first users
		return NextResponse.json({
			success: true,
			pending: !isFirstUser,
			message: isFirstUser
				? 'Account created successfully! You are the first user and have been granted administrator privileges.'
				: 'Registration successful! Your account is pending approval by an administrator.',
			user: {
				id: user.id,
				username: user.username,
				name: user.name,
				role: user.role,
				approved: user.approved,
			},
		});
	} catch (error) {
		console.error('Registration error:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
