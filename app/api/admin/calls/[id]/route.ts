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

// GET - Get single call
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const auth = await requireAdmin();
		if ('error' in auth) {
			return NextResponse.json({ error: auth.error }, { status: auth.status });
		}

		const { id } = await params;

		const call = await prisma.call.findUnique({
			where: { id },
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

		if (!call) {
			return NextResponse.json({ error: 'Call not found' }, { status: 404 });
		}

		return NextResponse.json(call);
	} catch (error) {
		console.error('Error fetching call:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

// PUT - Update call
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const auth = await requireAdmin();
		if ('error' in auth) {
			return NextResponse.json({ error: auth.error }, { status: auth.status });
		}

		const { id } = await params;
		const body = await request.json();
		const { caller, callerPhone, reason, timeStart, timeEnd, comments } = body;

		const call = await prisma.call.update({
			where: { id },
			data: {
				caller,
				callerPhone,
				reason,
				timeStart: timeStart ? new Date(timeStart) : undefined,
				timeEnd: timeEnd ? new Date(timeEnd) : null,
				comments: comments || null,
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

		return NextResponse.json(call);
	} catch (error) {
		console.error('Error updating call:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

// DELETE - Delete call
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const auth = await requireAdmin();
		if ('error' in auth) {
			return NextResponse.json({ error: auth.error }, { status: auth.status });
		}

		const { id } = await params;

		await prisma.call.delete({
			where: { id },
		});

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Error deleting call:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
