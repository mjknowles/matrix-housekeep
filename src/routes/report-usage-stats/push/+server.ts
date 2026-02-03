import type { RequestHandler } from './$types';
import type { RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { usageReport } from '$lib/server/db/schema';

const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQUESTS = 30;
const rateBuckets = new Map<string, { count: number; windowStart: number }>();

const numericKeys = [
	'total_users',
	'total_room_count',
	'daily_active_users',
	'monthly_active_users',
	'daily_messages',
	'daily_sent_messages',
	'daily_active_rooms',
	'daily_e2ee_messages',
	'daily_sent_e2ee_messages',
	'daily_active_e2ee_rooms',
	'daily_user_type_native',
	'daily_user_type_bridged',
	'daily_user_type_guest',
	'cpu_average',
	'memory_rss',
	'cache_factor',
	'event_cache_size',
	'r30v2_users_all',
	'r30v2_users_android',
	'r30v2_users_electron',
	'r30v2_users_ios',
	'r30v2_users_web'
];

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

function checkRateLimit(clientAddress: string) {
	const now = Date.now();
	const existing = rateBuckets.get(clientAddress);
	if (!existing || now - existing.windowStart > RATE_WINDOW_MS) {
		rateBuckets.set(clientAddress, { count: 1, windowStart: now });
		return { allowed: true };
	}

	if (existing.count >= RATE_MAX_REQUESTS) {
		return { allowed: false, retryAfterSeconds: Math.ceil((existing.windowStart + RATE_WINDOW_MS - now) / 1000) };
	}

	existing.count += 1;
	return { allowed: true };
}

function validatePayload(payload: unknown): { ok: true; value: Record<string, unknown> } | { ok: false; error: string } {
	if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
		return { ok: false, error: 'Payload must be an object' };
	}

	const record = payload as Record<string, unknown>;
	const stats = record.stats;
	if (stats !== undefined && (typeof stats !== 'object' || Array.isArray(stats) || stats === null)) {
		return { ok: false, error: 'Payload stats must be an object' };
	}

	if (record.homeserver !== undefined && typeof record.homeserver !== 'string') {
		return { ok: false, error: 'Payload homeserver must be a string' };
	}
	if (record.server_context !== undefined && typeof record.server_context !== 'string') {
		return { ok: false, error: 'Payload server_context must be a string' };
	}

	let hasKnownNumber = false;
	const statsRecord = (stats ?? {}) as Record<string, unknown>;
	for (const key of numericKeys) {
		if (Object.prototype.hasOwnProperty.call(record, key)) {
			if (typeof record[key] !== 'number') {
				return { ok: false, error: `Payload ${key} must be a number` };
			}
			hasKnownNumber = true;
		}
		if (Object.prototype.hasOwnProperty.call(statsRecord, key)) {
			if (typeof statsRecord[key] !== 'number') {
				return { ok: false, error: `Payload stats.${key} must be a number` };
			}
			hasKnownNumber = true;
		}
	}

	if (!hasKnownNumber) {
		return { ok: false, error: 'Payload is missing known usage fields' };
	}

	return { ok: true, value: record };
}

const handleRequest: RequestHandler = async ({
	request,
	url,
	getClientAddress
}: RequestEvent) => {
	const expectedToken = env.USAGE_STATS_TOKEN;
	if (!expectedToken) {
		return new Response('Usage stats token not configured', { status: 500 });
	}

	const providedToken = getTokenFromRequest(request) ?? url.searchParams.get('access_token');
	if (!providedToken || providedToken !== expectedToken) {
		return new Response('Unauthorized', { status: 401 });
	}

	const clientAddress = getClientAddress();
	const limitCheck = checkRateLimit(clientAddress);
	if (!limitCheck.allowed) {
		return new Response('Too many requests', {
			status: 429,
			headers: {
				'Retry-After': String(limitCheck.retryAfterSeconds ?? 60)
			}
		});
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

	const validated = validatePayload(payload);
	if (!validated.ok) {
		return new Response(validated.error, { status: 400 });
	}

	payload = validated.value;
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
