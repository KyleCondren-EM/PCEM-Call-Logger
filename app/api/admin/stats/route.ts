import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

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
		const startOfToday = new Date(now.setHours(0, 0, 0, 0));
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

		const [
			totalUsers,
			pendingUsers,
			approvedUsers,
			passwordResetRequests,
			administrators,
			totalCalls,
			todayCalls,
			weekCalls,
			monthCalls,
			callsByReason,
			topCallTakers,
			dailyCallCounts,
			recentLogins,
		] = await Promise.all([
			prisma.user.count(),
			prisma.user.count({ where: { approved: false } }),
			prisma.user.count({ where: { approved: true } }),
			prisma.user.count({ where: { passwordResetRequested: true } }),
			prisma.user.count({ where: { role: 'ADMINISTRATOR' } }),
			prisma.call.count(),
			prisma.call.count({
				where: { createdAt: { gte: startOfToday } },
			}),
			prisma.call.count({
				where: { createdAt: { gte: startOfWeek } },
			}),
			prisma.call.count({
				where: { createdAt: { gte: startOfMonth } },
			}),
			// Get calls grouped by reason
			prisma.call.groupBy({
				by: ['reason'],
				_count: { reason: true },
				orderBy: { _count: { reason: 'desc' } },
				take: 10,
			}),
			// Get top call takers
			prisma.user.findMany({
				where: { approved: true },
				select: {
					id: true,
					name: true,
					username: true,
					_count: { select: { calls: true } },
				},
				orderBy: { calls: { _count: 'desc' } },
				take: 5,
			}),
			// Get calls per day for last 7 days
			Promise.all(
				last7Days.map(async (date) => {
					const nextDay = new Date(date);
					nextDay.setDate(nextDay.getDate() + 1);
					const count = await prisma.call.count({
						where: {
							createdAt: { gte: date, lt: nextDay },
						},
					});
					return {
						date: date.toISOString().split('T')[0],
						dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
						count,
					};
				}),
			),
			// Get recent login activity count
			prisma.activityLog.count({
				where: {
					action: 'LOGIN',
					createdAt: { gte: startOfToday },
				},
			}),
		]);

		// Process reason breakdown (reasons can be comma-separated)
		const reasonCounts: Record<string, number> = {};
		callsByReason.forEach((item) => {
			const reasons = item.reason.split(',').map((r) => r.trim());
			reasons.forEach((reason) => {
				reasonCounts[reason] = (reasonCounts[reason] || 0) + item._count.reason;
			});
		});
		const reasonBreakdown = Object.entries(reasonCounts)
			.map(([reason, count]) => ({ reason, count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 8);

		return NextResponse.json({
			users: {
				total: totalUsers,
				pending: pendingUsers,
				approved: approvedUsers,
				passwordResetRequests: passwordResetRequests,
				administrators: administrators,
			},
			calls: {
				total: totalCalls,
				today: todayCalls,
				week: weekCalls,
				month: monthCalls,
			},
			charts: {
				dailyCalls: dailyCallCounts,
				reasonBreakdown,
				topCallTakers: topCallTakers.map((u) => ({
					id: u.id,
					name: u.name,
					username: u.username,
					callCount: u._count.calls,
				})),
			},
			activity: {
				loginsToday: recentLogins,
			},
		});
	} catch (error) {
		console.error('Error fetching stats:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
