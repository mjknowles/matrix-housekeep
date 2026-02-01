import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { usageReport } from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.session?.isAdmin) {
		throw error(403, 'Forbidden');
	}

	const rows = await db
		.select({
			id: usageReport.id,
			receivedAt: usageReport.receivedAt,
			homeserver: usageReport.homeserver,
			serverContext: usageReport.serverContext,
			totalUsers: usageReport.totalUsers,
			totalRoomCount: usageReport.totalRoomCount,
			dailyActiveUsers: usageReport.dailyActiveUsers,
			dailyMessages: usageReport.dailyMessages,
			payload: usageReport.payload
		})
		.from(usageReport)
		.orderBy(desc(usageReport.receivedAt))
		.limit(10);

	return { rows };
};
