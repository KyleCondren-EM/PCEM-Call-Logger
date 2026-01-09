import { Pool } from 'pg';

const globalForPg = globalThis as unknown as {
	pool: Pool | undefined;
};

function createPool(): Pool {
	const connectionString = process.env.DATABASE_URL;

	if (!connectionString) {
		throw new Error('DATABASE_URL environment variable is not set');
	}

	return new Pool({
		connectionString,
		ssl: connectionString.includes('neon.tech') || connectionString.includes('sslmode=require')
			? { rejectUnauthorized: false }
			: undefined,
		max: 10,
		idleTimeoutMillis: 30000,
		connectionTimeoutMillis: 10000,
	});
}

export const pool = globalForPg.pool ?? createPool();

if (process.env.NODE_ENV !== 'production') {
	globalForPg.pool = pool;
}

export async function query<T = Record<string, unknown>>(
	text: string,
	params?: unknown[]
): Promise<T[]> {
	const result = await pool.query(text, params);
	return result.rows as T[];
}

export async function queryOne<T = Record<string, unknown>>(
	text: string,
	params?: unknown[]
): Promise<T | null> {
	const result = await pool.query(text, params);
	return (result.rows[0] as T) || null;
}

export async function execute(
	text: string,
	params?: unknown[]
): Promise<number> {
	const result = await pool.query(text, params);
	return result.rowCount ?? 0;
}
