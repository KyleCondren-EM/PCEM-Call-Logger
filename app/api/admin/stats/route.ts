import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getSession } from '@/lib/auth';

interface CountResult {
	count: string;
}

interface ReasonCount {
	reason: string;
	count: string;
}

interface TopCallTaker {
	id: string;
	name: string;
	username: string;
	callCount: string;
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

// GET - Dashboard statistics
export async function GET() {
	try {
		const auth = await requireAdmin();
		if ('error' in auth) {
			return NextResponse.json({ error: auth.error }, { status: auth.status });
		}

		const now = new Date();
		const startOfToday = new Date(now);
		startOfToday.setHours(0, 0, 0, 0);

		const startOfWeek = new Date(now);
		startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
		startOfWeek.setHours(0, 0, 0, 0);

		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

		// Get last 7 days for chart data
		const last7Days = Array.from({ length: 7 }, (_, i) => {
			const date = new Date();
			date.setDate(date.getDate() - (6 - i));
			date.setHours(0, 0, 0, 0);
			return date;
		});

		// Run all queries in parallel
		const [
			totalUsersResult,
			pendingUsersResult,
			approvedUsersResult,
			passwordResetRequestsResult,
			administratorsResult,
			totalCallsResult,
			todayCallsResult,
			weekCallsResult,
			monthCallsResult,
			callsByReason,
			topCallTakers,
			recentLoginsResult,
		] = await Promise.all([
			queryOne<CountResult>(`SELECT COUNT(*) as count FROM "User"`),
			queryOne<CountResult>(`SELECT COUNT(*) as count FROM "User" WHERE approved = false`),
			queryOne<CountResult>(`SELECT COUNT(*) as count FROM "User" WHERE approved = true`),
			queryOne<CountResult>(`SELECT COUNT(*) as count FROM "User" WHERE "passwordResetRequested" = true`),
			queryOne<CountResult>(`SELECT COUNT(*) as count FROM "User" WHERE role = 'ADMINISTRATOR'`),
			queryOne<CountResult>(`SELECT COUNT(*) as count FROM "Call"`),
			queryOne<CountResult>(`SELECT COUNT(*) as count FROM "Call" WHERE "createdAt" >= $1`, [startOfToday]),
			queryOne<CountResult>(`SELECT COUNT(*) as count FROM "Call" WHERE "createdAt" >= $1`, [startOfWeek]),
			queryOne<CountResult>(`SELECT COUNT(*) as count FROM "Call" WHERE "createdAt" >= $1`, [startOfMonth]),
			// Get calls grouped by reason
			query<ReasonCount>(
				`SELECT reason, COUNT(*) as count FROM "Call" GROUP BY reason ORDER BY count DESC LIMIT 10`
			),
			// Get top call takers
			query<TopCallTaker>(
				`SELECT u.id, u.name, u.username, COUNT(c.id) as "callCount"
				 FROM "User" u
				 LEFT JOIN "Call" c ON u.id = c."callTakerId"
				 WHERE u.approved = true
				 GROUP BY u.id
				 ORDER BY "callCount" DESC
				 LIMIT 5`
			),
			// Get recent login activity count
			queryOne<CountResult>(
				`SELECT COUNT(*) as count FROM "ActivityLog" WHERE action = 'LOGIN' AND "createdAt" >= $1`,
				[startOfToday]
			),
		]);

		// Get calls per day for last 7 days
		const dailyCallCounts = await Promise.all(
			last7Days.map(async (date) => {
				const nextDay = new Date(date);
				nextDay.setDate(nextDay.getDate() + 1);
				const result = await queryOne<CountResult>(
					`SELECT COUNT(*) as count FROM "Call" WHERE "createdAt" >= $1 AND "createdAt" < $2`,
					[date, nextDay]
				);
				return {
					date: date.toISOString().split('T')[0],
					dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
					count: parseInt(result?.count || '0', 10),
				};
			})
		);

		// Process reason breakdown (reasons can be comma-separated)
		const reasonCounts: Record<string, number> = {};
		callsByReason.forEach((item) => {
			const reasons = item.reason.split(',').map((r) => r.trim());
			const count = parseInt(item.count, 10);
			reasons.forEach((reason) => {
				reasonCounts[reason] = (reasonCounts[reason] || 0) + count;
			});
		});
		const reasonBreakdown = Object.entries(reasonCounts)
			.map(([reason, count]) => ({ reason, count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 8);

		return NextResponse.json({
			users: {
				total: parseInt(totalUsersResult?.count || '0', 10),
				pending: parseInt(pendingUsersResult?.count || '0', 10),
				approved: parseInt(approvedUsersResult?.count || '0', 10),
				passwordResetRequests: parseInt(passwordResetRequestsResult?.count || '0', 10),
				administrators: parseInt(administratorsResult?.count || '0', 10),
			},
			calls: {
				total: parseInt(totalCallsResult?.count || '0', 10),
				today: parseInt(todayCallsResult?.count || '0', 10),
				week: parseInt(weekCallsResult?.count || '0', 10),
				month: parseInt(monthCallsResult?.count || '0', 10),
			},
			charts: {
				dailyCalls: dailyCallCounts,
				reasonBreakdown,
				topCallTakers: topCallTakers.map((u) => ({
					id: u.id,
					name: u.name,
					username: u.username,
					callCount: parseInt(u.callCount, 10),
				})),
			},
			activity: {
				loginsToday: parseInt(recentLoginsResult?.count || '0', 10),
			},
		});
	} catch (error) {
		console.error('Error fetching stats:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
