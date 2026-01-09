import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getSession } from '@/lib/auth';
import type { Call } from '@/lib/types';

interface CallWithCallTaker extends Call {
	callTakerName: string;
	callTakerUsername: string;
}

// Helper to check if user is admin
async function requireAdmin() {
	const session = await getSession();
	if (!session) {
		return { error: 'Not authenticated', status: 401 };
	}
	if (session.role !== 'ADMINISTRATOR') {
		return { error: 'Access denied. Administrator privileges required.', status: 403 };
	}
	return { session };
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

// GET - List all calls with filtering
export async function GET(request: NextRequest) {
	try {
		const auth = await requireAdmin();
		if ('error' in auth) {
			return NextResponse.json({ error: auth.error }, { status: auth.status });
		}

		const searchParams = request.nextUrl.searchParams;
		const search = searchParams.get('search') || '';
		const userId = searchParams.get('userId') || '';
		const page = parseInt(searchParams.get('page') || '1');
		const limit = parseInt(searchParams.get('limit') || '50');
		const offset = (page - 1) * limit;

		// Build WHERE clause
		const conditions: string[] = [];
		const values: unknown[] = [];
		let paramIndex = 1;

		if (userId) {
			conditions.push(`c."callTakerId" = $${paramIndex++}`);
			values.push(userId);
		}

		if (search) {
			const searchPattern = `%${search}%`;
			conditions.push(`(c.caller ILIKE $${paramIndex} OR c."callerPhone" ILIKE $${paramIndex} OR c.reason ILIKE $${paramIndex} OR c.comments ILIKE $${paramIndex})`);
			values.push(searchPattern);
			paramIndex++;
		}

		const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

		// Get calls with pagination
		const calls = await query<CallWithCallTaker>(
			`SELECT c.*, u.id as "callTakerId", u.name as "callTakerName", u.username as "callTakerUsername"
			 FROM "Call" c
			 JOIN "User" u ON c."callTakerId" = u.id
			 ${whereClause}
			 ORDER BY c."createdAt" DESC
			 LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
			[...values, limit, offset]
		);

		// Get total count
		const countResult = await queryOne<{ count: string }>(
			`SELECT COUNT(*) as count FROM "Call" c ${whereClause}`,
			values
		);
		const total = parseInt(countResult?.count || '0', 10);

		return NextResponse.json({
			calls: calls.map(formatCall),
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		});
	} catch (error) {
		console.error('Error fetching calls:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
