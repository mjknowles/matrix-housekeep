import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { usageReport } from '$lib/server/db/schema';
import { and, desc, eq, lt, or } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

const parsePayload = (raw: string) => {
	try {
		return JSON.parse(raw) as Record<string, unknown>;
	} catch {
		return {};
	}
};

const toMs = (value: Date | number | null) => {
	if (!value) return null;
	return value instanceof Date ? value.getTime() : value;
};

const parseCursor = (value: string | null) => {
	if (!value) return null;
	const [tsPart, ...idParts] = value.split(':');
	const ts = Number(tsPart);
	const id = idParts.join(':');
	if (!Number.isFinite(ts) || !id) return null;
	return { ts, id };
};

const rowToReport = (row: typeof usageReport.$inferSelect) => {
	const payload = parsePayload(row.payload);
	return {
		receivedAt: toMs(row.receivedAt),
		homeserver: row.homeserver ?? null,
		serverContext: row.serverContext ?? null,
		totalUsers: row.totalUsers ?? null,
		totalRoomCount: row.totalRoomCount ?? null,
		dailyActiveUsers: row.dailyActiveUsers ?? null,
		monthlyActiveUsers: row.monthlyActiveUsers ?? null,
		dailyMessages: row.dailyMessages ?? null,
		dailySentMessages: row.dailySentMessages ?? null,
		dailyActiveRooms: row.dailyActiveRooms ?? null,
		dailyE2eeMessages: (payload.daily_e2ee_messages as number | undefined) ?? null,
		dailySentE2eeMessages: (payload.daily_sent_e2ee_messages as number | undefined) ?? null,
		dailyActiveE2eeRooms: (payload.daily_active_e2ee_rooms as number | undefined) ?? null,
		dailyUserTypeNative: (payload.daily_user_type_native as number | undefined) ?? null,
		dailyUserTypeBridged: (payload.daily_user_type_bridged as number | undefined) ?? null,
		dailyUserTypeGuest: (payload.daily_user_type_guest as number | undefined) ?? null,
		cpuAverage: (payload.cpu_average as number | undefined) ?? null,
		memoryRss: (payload.memory_rss as number | undefined) ?? null,
		cacheFactor: (payload.cache_factor as number | undefined) ?? null,
		eventCacheSize: (payload.event_cache_size as number | undefined) ?? null,
		r30v2UsersAll: (payload.r30v2_users_all as number | undefined) ?? null,
		r30v2UsersAndroid: (payload.r30v2_users_android as number | undefined) ?? null,
		r30v2UsersElectron: (payload.r30v2_users_electron as number | undefined) ?? null,
		r30v2UsersIos: (payload.r30v2_users_ios as number | undefined) ?? null,
		r30v2UsersWeb: (payload.r30v2_users_web as number | undefined) ?? null
	};
};

export const GET = async ({ locals, url }) => {
	if (!locals.session?.isAdmin) {
		throw error(403, 'Forbidden');
	}

	const limitRaw = Number(url.searchParams.get('limit') ?? '200');
	const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 1000) : 200;
	const cursor = parseCursor(url.searchParams.get('before'));

	const whereClause = cursor
		? or(
				lt(usageReport.receivedAt, new Date(cursor.ts)),
				and(eq(usageReport.receivedAt, new Date(cursor.ts)), lt(usageReport.id, cursor.id))
			)
		: undefined;

	const rowsQuery = db
		.select({
			id: usageReport.id,
			receivedAt: usageReport.receivedAt,
			homeserver: usageReport.homeserver,
			serverContext: usageReport.serverContext,
			totalUsers: usageReport.totalUsers,
			totalRoomCount: usageReport.totalRoomCount,
			dailyActiveUsers: usageReport.dailyActiveUsers,
			monthlyActiveUsers: usageReport.monthlyActiveUsers,
			dailyMessages: usageReport.dailyMessages,
			dailySentMessages: usageReport.dailySentMessages,
			dailyActiveRooms: usageReport.dailyActiveRooms,
			payload: usageReport.payload
		})
		.from(usageReport);

	const rows = await (whereClause ? rowsQuery.where(whereClause) : rowsQuery)
		.orderBy(desc(usageReport.receivedAt))
		.limit(limit);

	const reports = rows.map(rowToReport).reverse();
	const lastRow = rows.at(-1);
	const lastTimestamp = lastRow ? toMs(lastRow.receivedAt) : null;
	const nextCursor = lastRow && lastTimestamp !== null ? `${lastTimestamp}:${lastRow.id}` : null;

	return json({
		latest: reports.at(-1) ?? null,
		reports,
		pagination: {
			limit,
			nextCursor
		}
	});
};
