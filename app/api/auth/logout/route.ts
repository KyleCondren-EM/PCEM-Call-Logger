import { NextResponse } from 'next/server';
import { deleteSession, getSession } from '@/lib/auth';
import { logActivity } from '@/lib/activityLog';

export async function POST() {
	const session = await getSession();

	if (session) {
		await logActivity({
			action: 'LOGOUT',
			description: `${session.name} (${session.username}) logged out`,
			userId: session.userId as string,
		});
	}

	await deleteSession();
	return NextResponse.json({ success: true });
}
