import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import type { User } from '@/lib/types';

export async function GET() {
	try {
		const session = await getSession();

		if (!session) {
			return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
		}

		// Fetch full user profile from database
		const user = await queryOne<User>(
			`SELECT id, username, name, email, phone, "jobTitle", department, "profileImage", role, "mustResetPassword", "passwordResetRequested", "createdAt"
			 FROM "User" WHERE id = $1`,
			[session.userId]
		);

		if (!user) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		return NextResponse.json({
			userId: user.id,
			username: user.username,
			name: user.name,
			email: user.email,
			phone: user.phone,
			jobTitle: user.jobTitle,
			department: user.department,
			profileImage: user.profileImage,
			role: user.role || 'USER',
			mustResetPassword: user.mustResetPassword,
			passwordResetRequested: user.passwordResetRequested,
			createdAt: user.createdAt,
		});
	} catch (error) {
		console.error('Get user error:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

export async function PUT(request: Request) {
	try {
		const session = await getSession();

		if (!session) {
			return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
		}

		const body = await request.json();
		const { name, email, phone, jobTitle, department, profileImage } = body;

		// Validate required fields
		if (!name || name.trim().length < 2) {
			return NextResponse.json({ error: 'Name must be at least 2 characters' }, { status: 400 });
		}

		// Validate email format if provided
		if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
		}

		// Validate phone format if provided (10 digits)
		if (phone) {
			const phoneDigits = phone.replace(/\D/g, '');
			if (phoneDigits.length !== 10) {
				return NextResponse.json({ error: 'Phone must be 10 digits' }, { status: 400 });
			}
		}

		// Update user profile
		const updatedUser = await queryOne<User>(
			`UPDATE "User" SET
				name = $1,
				email = $2,
				phone = $3,
				"jobTitle" = $4,
				department = $5,
				"profileImage" = $6,
				"updatedAt" = NOW()
			 WHERE id = $7
			 RETURNING id, username, name, email, phone, "jobTitle", department, "profileImage", role`,
			[
				name.trim(),
				email?.trim() || null,
				phone ? phone.replace(/\D/g, '') : null,
				jobTitle?.trim() || null,
				department?.trim() || null,
				profileImage || null,
				session.userId,
			]
		);

		if (!updatedUser) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		return NextResponse.json({
			userId: updatedUser.id,
			username: updatedUser.username,
			name: updatedUser.name,
			email: updatedUser.email,
			phone: updatedUser.phone,
			jobTitle: updatedUser.jobTitle,
			department: updatedUser.department,
			profileImage: updatedUser.profileImage,
			role: updatedUser.role,
		});
	} catch (error) {
		console.error('Update profile error:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
