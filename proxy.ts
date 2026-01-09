import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromRequest } from './lib/auth';

const proxy = async (request: NextRequest) => {
	const session = await getSessionFromRequest(request);
	const isAuthPage =
		request.nextUrl.pathname.startsWith('/login') ||
		request.nextUrl.pathname.startsWith('/register') ||
		request.nextUrl.pathname.startsWith('/request-reset');
	const isAdminPage = request.nextUrl.pathname.startsWith('/admin');

	if (!session && !isAuthPage) {
		return NextResponse.redirect(new URL('/login', request.url));
	}

	if (session && isAuthPage) {
		return NextResponse.redirect(new URL('/', request.url));
	}

	// Protect admin pages - only administrators can access
	if (isAdminPage && session?.role !== 'ADMINISTRATOR') {
		return NextResponse.redirect(new URL('/', request.url));
	}

	return NextResponse.next();
};

export default proxy;

export const config = {
	matcher: ['/((?!api|_next/static|_next/image|favicon.ico|assets|icons).*)'],
};
