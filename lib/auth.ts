import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const secretKey = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const key = new TextEncoder().encode(secretKey);

// Session timeout: 12 hours
const SESSION_TIMEOUT_HOURS = 12;

export async function encrypt(payload: any) {
	return await new SignJWT(payload)
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime(`${SESSION_TIMEOUT_HOURS}h`)
		.sign(key);
}

export async function decrypt(token: string): Promise<any> {
	try {
		const { payload } = await jwtVerify(token, key, {
			algorithms: ['HS256'],
		});
		return payload;
	} catch (error) {
		return null;
	}
}

export async function createSession(userId: string, username: string, name: string, role: string = 'USER') {
	const expires = new Date(Date.now() + SESSION_TIMEOUT_HOURS * 60 * 60 * 1000); // 12 hours
	const session = await encrypt({ userId, username, name, role, expires });

	const cookieStore = await cookies();
	cookieStore.set('session', session, {
		expires,
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		path: '/',
	});
}

export async function getSession() {
	const cookieStore = await cookies();
	const session = cookieStore.get('session')?.value;
	if (!session) return null;
	return await decrypt(session);
}

export async function deleteSession() {
	const cookieStore = await cookies();
	cookieStore.delete('session');
}

export async function getSessionFromRequest(request: NextRequest) {
	const session = request.cookies.get('session')?.value;
	if (!session) return null;
	return await decrypt(session);
}
