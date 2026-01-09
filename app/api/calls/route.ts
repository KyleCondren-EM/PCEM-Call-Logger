import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { logActivity } from '@/lib/activityLog';

export async function GET(request: Request) {
	try {
		const session = await getSession();
		if (!session) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { searchParams } = new URL(request.url);
		const search = searchParams.get('search') || '';
		const limit = parseInt(searchParams.get('limit') || '50');

		// SQLite doesn't support mode: 'insensitive', so we use LOWER() comparison via raw filter
		// For SQLite with libsql adapter, use simple contains without mode
		const calls = await prisma.call.findMany({
			where: search
				? {
						OR: [
							{ caller: { contains: search } },
							{ callerPhone: { contains: search } },
							{ reason: { contains: search } },
						],
				  }
				: undefined,
			include: {
				callTaker: {
					select: {
						id: true,
						name: true,
						username: true,
					},
				},
			},
			orderBy: {
				timeStart: 'desc',
			},
			take: limit,
		});

		return NextResponse.json(calls);
	} catch (error) {
		console.error('Error fetching calls:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

export async function POST(request: Request) {
	try {
		const session = await getSession();
		if (!session) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const body = await request.json();
		const { caller, callerPhone, reason, timeStart, timeEnd, comments } = body;

		if (!caller || !callerPhone || !reason || !timeStart) {
			return NextResponse.json({ error: 'Caller, phone, reason, and start time are required' }, { status: 400 });
		}

		// Validate caller name is at least 2 characters
		if (caller.trim().length < 2) {
			return NextResponse.json({ error: 'Caller name must be at least 2 characters' }, { status: 400 });
		}

		// Validate phone number is exactly 10 digits
		const phoneDigits = callerPhone.replace(/\D/g, '');
		if (phoneDigits.length !== 10) {
			return NextResponse.json({ error: 'Phone number must be exactly 10 digits' }, { status: 400 });
		}

		const call = await prisma.call.create({
			data: {
				caller: caller.trim(),
				callerPhone: phoneDigits,
				reason,
				timeStart: new Date(timeStart),
				timeEnd: timeEnd ? new Date(timeEnd) : null,
				comments: comments || null,
				callTakerId: session.userId,
			},
			include: {
				callTaker: {
					select: {
						id: true,
						name: true,
						username: true,
					},
				},
			},
		});

		// Log activity
		await logActivity({
			action: 'CALL_CREATED',
			description: `${session.name} logged a call from ${caller.trim()}`,
			userId: session.userId as string,
			targetId: call.id,
			targetType: 'CALL',
		});

		return NextResponse.json(call);
	} catch (error) {
		console.error('Error creating call:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
