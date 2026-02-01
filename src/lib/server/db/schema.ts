import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const usageReport = sqliteTable('usage_report', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	receivedAt: integer('received_at', { mode: 'timestamp_ms' }).notNull(),
	homeserver: text('homeserver'),
	serverContext: text('server_context'),
	totalUsers: integer('total_users'),
	totalRoomCount: integer('total_room_count'),
	dailyActiveUsers: integer('daily_active_users'),
	monthlyActiveUsers: integer('monthly_active_users'),
	dailyMessages: integer('daily_messages'),
	dailySentMessages: integer('daily_sent_messages'),
	dailyActiveRooms: integer('daily_active_rooms'),
	payload: text('payload').notNull()
});
