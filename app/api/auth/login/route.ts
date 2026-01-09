import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { createSession } from '@/lib/auth';
import { logActivity } from '@/lib/activityLog';

export async function POST(request: Request) {
	try {
		const { username, password } = await request.json();

		if (!username || !password) {
			return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
		}

		// Normalize username to uppercase for lookup (matches registration normalization)
		const normalizedUsername = username.toUpperCase().replace(/[^A-Z0-9]/g, '');

		const user = await prisma.user.findUnique({
			where: { username: normalizedUsername },
		});

		if (!user) {
			return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
		}

		const passwordMatch = await bcrypt.compare(password, user.password);

		if (!passwordMatch) {
			return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
		}

		// Check if user is approved (administrators are auto-approved)
		if (!user.approved && user.role !== 'ADMINISTRATOR') {
			return NextResponse.json(
				{ error: 'Your account is pending approval. Please wait for an administrator to approve your registration.' },
				{ status: 403 },
			);
		}

		await createSession(user.id, user.username, user.name, user.role);

		// Log activity
		await logActivity({
			action: 'LOGIN',
			description: `${user.name} (${user.username}) logged in`,
			userId: user.id,
		});

		return NextResponse.json({
			success: true,
			user: {
				id: user.id,
				username: user.username,
				name: user.name,
				role: user.role,
			},
		});
	} catch (error) {
		console.error('Login error:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
