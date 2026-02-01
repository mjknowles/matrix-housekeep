import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = new Database(env.DATABASE_URL);

if (process.env.NODE_ENV !== 'production') {
	client.exec(`
		CREATE TABLE IF NOT EXISTS usage_report (
			id TEXT PRIMARY KEY,
			received_at INTEGER NOT NULL,
			homeserver TEXT,
			server_context TEXT,
			total_users INTEGER,
			total_room_count INTEGER,
			daily_active_users INTEGER,
			monthly_active_users INTEGER,
			daily_messages INTEGER,
			daily_sent_messages INTEGER,
			daily_active_rooms INTEGER,
			payload TEXT NOT NULL
		);
	`);
}

export const db = drizzle(client, { schema });
