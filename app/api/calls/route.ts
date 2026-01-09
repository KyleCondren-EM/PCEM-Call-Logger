import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { logActivity } from '@/lib/activityLog';
import type { Call } from '@/lib/types';

interface CallWithCallTaker extends Call {
	callTakerName: string;
	callTakerUsername: string;
}

export async function GET(request: Request) {
	try {
		const session = await getSession();
		if (!session) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { searchParams } = new URL(request.url);
		const search = searchParams.get('search') || '';
		const limit = parseInt(searchParams.get('limit') || '50');

		let calls: CallWithCallTaker[];

		if (search) {
			const searchPattern = `%${search}%`;
			calls = await query<CallWithCallTaker>(
				`SELECT c.*, u.id as "callTakerId", u.name as "callTakerName", u.username as "callTakerUsername"
				 FROM "Call" c
				 JOIN "User" u ON c."callTakerId" = u.id
				 WHERE c.caller ILIKE $1 OR c."callerPhone" ILIKE $1 OR c.reason ILIKE $1
				 ORDER BY c."timeStart" DESC
				 LIMIT $2`,
				[searchPattern, limit]
			);
		} else {
			calls = await query<CallWithCallTaker>(
				`SELECT c.*, u.id as "callTakerId", u.name as "callTakerName", u.username as "callTakerUsername"
				 FROM "Call" c
				 JOIN "User" u ON c."callTakerId" = u.id
				 ORDER BY c."timeStart" DESC
				 LIMIT $1`,
				[limit]
			);
		}

		// Transform to match the original Prisma response format
		const formattedCalls = calls.map((call) => ({
			id: call.id,
			caller: call.caller,
			callerPhone: call.callerPhone,
			reason: call.reason,
			timeStart: call.timeStart,
			timeEnd: call.timeEnd,
			comments: call.comments,
			callTakerId: call.callTakerId,
			createdAt: call.createdAt,
			updatedAt: call.updatedAt,
			callTaker: {
				id: call.callTakerId,
				name: call.callTakerName,
				username: call.callTakerUsername,
			},
		}));

		return NextResponse.json(formattedCalls);
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

		const id = crypto.randomUUID();
		const now = new Date();

		await query(
			`INSERT INTO "Call" (id, caller, "callerPhone", reason, "timeStart", "timeEnd", comments, "callTakerId", "createdAt", "updatedAt")
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
			[
				id,
				caller.trim(),
				phoneDigits,
				reason,
				new Date(timeStart),
				timeEnd ? new Date(timeEnd) : null,
				comments || null,
				session.userId,
				now,
				now,
			]
		);

		// Get the call with callTaker info
		const call = await queryOne<CallWithCallTaker>(
			`SELECT c.*, u.id as "callTakerId", u.name as "callTakerName", u.username as "callTakerUsername"
			 FROM "Call" c
			 JOIN "User" u ON c."callTakerId" = u.id
			 WHERE c.id = $1`,
			[id]
		);

		// Log activity
		await logActivity({
			action: 'CALL_CREATED',
			description: `${session.name} logged a call from ${caller.trim()}`,
			userId: session.userId as string,
			targetId: id,
			targetType: 'CALL',
		});

		// Transform to match the original Prisma response format
		const formattedCall = call
			? {
					id: call.id,
					caller: call.caller,
					callerPhone: call.callerPhone,
					reason: call.reason,
					timeStart: call.timeStart,
					timeEnd: call.timeEnd,
					comments: call.comments,
					callTakerId: call.callTakerId,
					createdAt: call.createdAt,
					updatedAt: call.updatedAt,
					callTaker: {
						id: call.callTakerId,
						name: call.callTakerName,
						username: call.callTakerUsername,
					},
			  }
			: null;

		return NextResponse.json(formattedCall);
	} catch (error) {
		console.error('Error creating call:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
