import type { RequestHandler } from './$types';
import type { RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { usageReport } from '$lib/server/db/schema';

function getTokenFromRequest(request: Request): string | null {
	const auth = request.headers.get('authorization');
	if (auth?.toLowerCase().startsWith('bearer ')) {
		return auth.slice('bearer '.length).trim();
	}
	return request.headers.get('x-usage-stats-token');
}

function extractNumber(payload: Record<string, unknown>, key: string): number | null {
	const direct = payload[key];
	if (typeof direct === 'number') return direct;
	const stats = payload.stats;
	if (stats && typeof stats === 'object' && typeof (stats as Record<string, unknown>)[key] === 'number') {
		return (stats as Record<string, unknown>)[key] as number;
	}
	return null;
}

const handleRequest: RequestHandler = async ({
	request,
	url
}: RequestEvent) => {
	const expectedToken = env.USAGE_STATS_TOKEN;
	if (!expectedToken) {
		return new Response('Usage stats token not configured', { status: 500 });
	}

	const providedToken = getTokenFromRequest(request) ?? url.searchParams.get('access_token');
	if (!providedToken || providedToken !== expectedToken) {
		return new Response('Unauthorized', { status: 401 });
	}

	const rawBody = await request.text();
	if (!rawBody) {
		return new Response('Missing body', { status: 400 });
	}
	if (rawBody.length > 1024 * 1024) {
		return new Response('Payload too large', { status: 413 });
	}

	let payload: Record<string, unknown>;
	try {
		payload = JSON.parse(rawBody) as Record<string, unknown>;
	} catch {
		return new Response('Invalid JSON', { status: 400 });
	}

	const homeserver = typeof payload.homeserver === 'string' ? payload.homeserver : null;
	const serverContext = typeof payload.server_context === 'string' ? payload.server_context : null;

	await db.insert(usageReport).values({
		receivedAt: new Date(),
		homeserver,
		serverContext,
		totalUsers: extractNumber(payload, 'total_users'),
		totalRoomCount: extractNumber(payload, 'total_room_count'),
		dailyActiveUsers: extractNumber(payload, 'daily_active_users'),
		monthlyActiveUsers: extractNumber(payload, 'monthly_active_users'),
		dailyMessages: extractNumber(payload, 'daily_messages'),
		dailySentMessages: extractNumber(payload, 'daily_sent_messages'),
		dailyActiveRooms: extractNumber(payload, 'daily_active_rooms'),
		payload: rawBody
	});

	return new Response(null, { status: 204 });
};

export const POST = handleRequest;
export const PUT = handleRequest;
