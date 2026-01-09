import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// GET a single call by ID
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const session = await getSession();
		if (!session) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
		const existingCall = await prisma.call.findUnique({
			where: { id },
		});

		if (!existingCall) {
			return NextResponse.json({ error: 'Call not found' }, { status: 404 });
		}

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

// DELETE a call
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const session = await getSession();
		if (!session) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await params;

		// Check if call exists
		const existingCall = await prisma.call.findUnique({
			where: { id },
		});

		if (!existingCall) {
			return NextResponse.json({ error: 'Call not found' }, { status: 404 });
		}

		await prisma.call.delete({
			where: { id },
		});

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Error deleting call:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
