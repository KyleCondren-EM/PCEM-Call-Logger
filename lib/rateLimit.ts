/**
 * Simple in-memory rate limiter using sliding window algorithm.
 * For production, consider using Redis for distributed rate limiting.
 */

interface RateLimitRecord {
	count: number;
	resetAt: number;
}

// In-memory store for rate limit records
const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up expired records periodically (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startCleanup() {
	if (cleanupTimer) return;
	cleanupTimer = setInterval(() => {
		const now = Date.now();
		for (const [key, record] of rateLimitStore.entries()) {
			if (record.resetAt < now) {
				rateLimitStore.delete(key);
			}
		}
	}, CLEANUP_INTERVAL);
}

interface RateLimitOptions {
	/** Maximum number of requests allowed within the window */
	limit: number;
	/** Time window in seconds */
	windowSeconds: number;
}

interface RateLimitResult {
	success: boolean;
	/** Remaining requests in the current window */
	remaining: number;
	/** Time when the rate limit resets (Unix timestamp in seconds) */
	resetAt: number;
	/** Number of seconds until rate limit resets */
	retryAfter: number;
}

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier (e.g., IP address, user ID)
 * @param options - Rate limit configuration
 * @returns RateLimitResult indicating if the request is allowed
 */
export function checkRateLimit(identifier: string, options: RateLimitOptions): RateLimitResult {
	startCleanup();

	const now = Date.now();
	const windowMs = options.windowSeconds * 1000;
	const key = identifier;

	let record = rateLimitStore.get(key);

	// If no record or record has expired, create new one
	if (!record || record.resetAt < now) {
		record = {
			count: 1,
			resetAt: now + windowMs,
		};
		rateLimitStore.set(key, record);
		return {
			success: true,
			remaining: options.limit - 1,
			resetAt: Math.ceil(record.resetAt / 1000),
			retryAfter: 0,
		};
	}

	// Check if limit exceeded
	if (record.count >= options.limit) {
		const retryAfter = Math.ceil((record.resetAt - now) / 1000);
		return {
			success: false,
			remaining: 0,
			resetAt: Math.ceil(record.resetAt / 1000),
			retryAfter,
		};
	}

	// Increment counter
	record.count++;
	rateLimitStore.set(key, record);

	return {
		success: true,
		remaining: options.limit - record.count,
		resetAt: Math.ceil(record.resetAt / 1000),
		retryAfter: 0,
	};
}

/**
 * Get the client IP address from the request
 */
export function getClientIP(request: Request): string {
	// Check various headers for the real IP (when behind proxy/load balancer)
	const forwardedFor = request.headers.get('x-forwarded-for');
	if (forwardedFor) {
		// x-forwarded-for can contain multiple IPs, take the first one
		return forwardedFor.split(',')[0].trim();
	}

	const realIP = request.headers.get('x-real-ip');
	if (realIP) {
		return realIP.trim();
	}

	// Fallback to a default identifier
	return 'unknown';
}

// Pre-configured rate limiters for common use cases
export const rateLimiters = {
	/** Login: 5 attempts per minute */
	login: { limit: 5, windowSeconds: 60 },
	/** Register: 3 attempts per minute */
	register: { limit: 3, windowSeconds: 60 },
	/** Password reset request: 3 attempts per 5 minutes */
	passwordReset: { limit: 3, windowSeconds: 300 },
	/** General API: 100 requests per minute */
	api: { limit: 100, windowSeconds: 60 },
};
