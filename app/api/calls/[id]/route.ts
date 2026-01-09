import { NextResponse } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import { getSession } from '@/lib/auth';
import type { Call } from '@/lib/types';

interface CallWithCallTaker extends Call {
	callTakerName: string;
	callTakerUsername: string;
}

function formatCall(call: CallWithCallTaker) {
	return {
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
	};
}

// GET a single call by ID
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const session = await getSession();
		if (!session) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await params;

		const call = await queryOne<CallWithCallTaker>(
			`SELECT c.*, u.id as "callTakerId", u.name as "callTakerName", u.username as "callTakerUsername"
			 FROM "Call" c
			 JOIN "User" u ON c."callTakerId" = u.id
			 WHERE c.id = $1`,
			[id]
		);

		if (!call) {
			return NextResponse.json({ error: 'Call not found' }, { status: 404 });
		}

		return NextResponse.json(formatCall(call));
	} catch (error) {
		console.error('Error fetching call:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

// UPDATE a call
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const session = await getSession();
		if (!session) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await params;
		const body = await request.json();
		const { caller, callerPhone, reason, timeStart, timeEnd, comments } = body;

		// Check if call exists
		const existingCall = await queryOne<{ id: string }>(
			`SELECT id FROM "Call" WHERE id = $1`,
			[id]
		);

		if (!existingCall) {
			return NextResponse.json({ error: 'Call not found' }, { status: 404 });
		}

		// Build update query dynamically based on provided fields
		const updates: string[] = [];
		const values: unknown[] = [];
		let paramIndex = 1;

		if (caller !== undefined) {
			updates.push(`caller = $${paramIndex++}`);
			values.push(caller);
		}
		if (callerPhone !== undefined) {
			updates.push(`"callerPhone" = $${paramIndex++}`);
			values.push(callerPhone);
		}
		if (reason !== undefined) {
			updates.push(`reason = $${paramIndex++}`);
			values.push(reason);
		}
		if (timeStart !== undefined) {
			updates.push(`"timeStart" = $${paramIndex++}`);
			values.push(new Date(timeStart));
		}
		if (timeEnd !== undefined) {
			updates.push(`"timeEnd" = $${paramIndex++}`);
			values.push(timeEnd ? new Date(timeEnd) : null);
		}
		if (comments !== undefined) {
			updates.push(`comments = $${paramIndex++}`);
			values.push(comments || null);
		}

		updates.push(`"updatedAt" = $${paramIndex++}`);
		values.push(new Date());
		values.push(id);

		await query(
			`UPDATE "Call" SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
			values
		);

		// Fetch updated call with callTaker
		const call = await queryOne<CallWithCallTaker>(
			`SELECT c.*, u.id as "callTakerId", u.name as "callTakerName", u.username as "callTakerUsername"
			 FROM "Call" c
			 JOIN "User" u ON c."callTakerId" = u.id
			 WHERE c.id = $1`,
			[id]
		);

		return NextResponse.json(call ? formatCall(call) : null);
	} catch (error) {
		console.error('Error updating call:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

// DELETE a call
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const session = await getSession();
		if (!session) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await params;

		// Check if call exists
		const existingCall = await queryOne<{ id: string }>(
			`SELECT id FROM "Call" WHERE id = $1`,
			[id]
		);

		if (!existingCall) {
			return NextResponse.json({ error: 'Call not found' }, { status: 404 });
		}

		await execute(`DELETE FROM "Call" WHERE id = $1`, [id]);

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Error deleting call:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
