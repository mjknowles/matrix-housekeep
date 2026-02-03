import { describe, it, expect, vi, beforeEach } from 'vitest';

const TOKEN = 'test-token';

vi.mock('$env/dynamic/private', () => ({
	env: {
		USAGE_STATS_TOKEN: TOKEN
	}
}));

vi.mock('$lib/server/db', () => ({
	db: {
		insert: () => ({
			values: vi.fn().mockResolvedValue(null)
		})
	}
}));

const buildRequest = (body: string, token = TOKEN) =>
	new Request('http://localhost/report-usage-stats/push', {
		method: 'POST',
		headers: {
			authorization: `Bearer ${token}`
		},
		body
	});

const buildEvent = (request: Request, clientAddress = '127.0.0.1') =>
	({
		request,
		url: new URL(request.url),
		getClientAddress: () => clientAddress
	}) as any;

const loadHandler = async () => {
	vi.resetModules();
	const mod = await import('../../../routes/report-usage-stats/push/+server');
	return mod.POST;
};

const validPayload = () =>
	JSON.stringify({
		homeserver: 'matrix.local',
		server_context: 'prod',
		total_users: 120,
		total_room_count: 42,
		daily_active_users: 10,
		monthly_active_users: 30,
		daily_messages: 500,
		daily_sent_messages: 480,
		daily_active_rooms: 12
	});

describe('report-usage-stats ingestion', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('rejects missing token', async () => {
		const handler = await loadHandler();
		const request = buildRequest(validPayload(), 'wrong-token');
		const response = await handler(buildEvent(request));
		expect(response.status).toBe(401);
	});

	it('rejects empty body', async () => {
		const handler = await loadHandler();
		const request = buildRequest('');
		const response = await handler(buildEvent(request));
		expect(response.status).toBe(400);
	});

	it('rejects oversized payload', async () => {
		const handler = await loadHandler();
		const huge = 'a'.repeat(1024 * 1024 + 1);
		const request = buildRequest(huge);
		const response = await handler(buildEvent(request));
		expect(response.status).toBe(413);
	});

	it('rejects invalid JSON', async () => {
		const handler = await loadHandler();
		const request = buildRequest('{not json');
		const response = await handler(buildEvent(request));
		expect(response.status).toBe(400);
	});

	it('rejects non-object payloads', async () => {
		const handler = await loadHandler();
		const request = buildRequest(JSON.stringify([]));
		const response = await handler(buildEvent(request));
		expect(response.status).toBe(400);
	});

	it('rejects payloads without known usage fields', async () => {
		const handler = await loadHandler();
		const request = buildRequest(JSON.stringify({ homeserver: 'matrix.local' }));
		const response = await handler(buildEvent(request));
		expect(response.status).toBe(400);
	});

	it('accepts a valid payload', async () => {
		const handler = await loadHandler();
		const request = buildRequest(validPayload());
		const response = await handler(buildEvent(request));
		expect(response.status).toBe(204);
	});

	it('rate limits excessive requests from the same client', async () => {
		const handler = await loadHandler();
		let lastStatus = 0;
		for (let i = 0; i < 31; i += 1) {
			const request = buildRequest(validPayload());
			// eslint-disable-next-line no-await-in-loop
			const response = await handler(buildEvent(request));
			lastStatus = response.status;
		}
		expect(lastStatus).toBe(429);
	});
});
