import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
	try {
		const session = await getSession();

		if (!session) {
			return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
		}

		// Fetch full user profile from database
		const user = await prisma.user.findUnique({
			where: { id: session.userId },
			select: {
				id: true,
				username: true,
				name: true,
				email: true,
				phone: true,
				jobTitle: true,
				department: true,
				profileImage: true,
				role: true,
				mustResetPassword: true,
				passwordResetRequested: true,
				createdAt: true,
			},
		});

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
		const updatedUser = await prisma.user.update({
			where: { id: session.userId },
			data: {
				name: name.trim(),
				email: email?.trim() || null,
				phone: phone ? phone.replace(/\D/g, '') : null,
				jobTitle: jobTitle?.trim() || null,
				department: department?.trim() || null,
				profileImage: profileImage || null,
			},
			select: {
				id: true,
				username: true,
				name: true,
				email: true,
				phone: true,
				jobTitle: true,
				department: true,
				profileImage: true,
				role: true,
			},
		});

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
