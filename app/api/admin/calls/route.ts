import { NextRequest, NextResponse } from 'next/server';
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

		const where: {
			callTakerId?: string;
			OR?: Array<{
				caller?: { contains: string };
				callerPhone?: { contains: string };
				reason?: { contains: string };
				comments?: { contains: string };
			}>;
		} = {};

		if (userId) {
			where.callTakerId = userId;
		}

		if (search) {
			where.OR = [
				{ caller: { contains: search } },
				{ callerPhone: { contains: search } },
				{ reason: { contains: search } },
				{ comments: { contains: search } },
			];
		}

		const [calls, total] = await Promise.all([
			prisma.call.findMany({
				where,
				include: {
					callTaker: {
						select: {
							id: true,
							name: true,
							username: true,
						},
					},
				},
				orderBy: { createdAt: 'desc' },
				skip: (page - 1) * limit,
				take: limit,
			}),
			prisma.call.count({ where }),
		]);

		return NextResponse.json({
			calls,
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
