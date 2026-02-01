import Database from 'better-sqlite3';

const args = process.argv.slice(2);
const getArgValue = (flag) => {
	const idx = args.indexOf(flag);
	if (idx === -1) return null;
	return args[idx + 1] ?? null;
};

if (args.includes('--help') || args.includes('-h')) {
	console.log(`Usage:
  node scripts/seed_usage_reports.mjs [--count N] [--db /path/to/db.sqlite]

Defaults:
  --count 25
  --db    DATABASE_URL env var
`);
	process.exit(0);
}

const countRaw = getArgValue('--count');
const count = Number.isFinite(Number(countRaw)) ? Number(countRaw) : 25;
const dbPath = getArgValue('--db') ?? process.env.DATABASE_URL;

if (!dbPath) {
	console.error('DATABASE_URL is not set and --db was not provided.');
	process.exit(1);
}

const basePayload = {
	cache_factor: 0.5,
	cpu_average: 0,
	daily_active_e2ee_rooms: 1,
	daily_active_rooms: 0,
	daily_active_users: 2,
	daily_e2ee_messages: 9,
	daily_messages: 0,
	daily_sent_e2ee_messages: 9,
	daily_sent_messages: 0,
	daily_user_type_bridged: 1,
	daily_user_type_guest: 0,
	daily_user_type_native: 2,
	database_engine: 'psycopg2',
	database_server_version: '17.7',
	event_cache_size: 10240,
	homeserver: 'ess.localhost',
	log_level: 'INFO',
	memory_rss: 239932,
	monthly_active_users: 2,
	python_version: '3.13.11',
	r30v2_users_all: 0,
	r30v2_users_android: 0,
	r30v2_users_electron: 0,
	r30v2_users_ios: 0,
	r30v2_users_web: 0,
	server_context: null,
	timestamp: Math.floor(Date.now() / 1000),
	total_nonbridged_users: 2,
	total_room_count: 1,
	total_users: 3,
	uptime_seconds: 300
};

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const makePayload = (i, total, prevTotals) => {
	const timestamp = basePayload.timestamp - (total - 1 - i) * 300;
	const burst = i % 8 === 0;
	const lull = i % 8 === 4;

	const totalUsers = Math.max(
		1,
		prevTotals.totalUsers + randInt(0, burst ? 3 : 1)
	);
	const totalRooms = Math.max(
		0,
		prevTotals.totalRooms + randInt(0, burst ? 2 : 1)
	);

	const dailyActiveUsers = Math.min(
		totalUsers,
		Math.max(0, Math.round(totalUsers * (burst ? 0.6 : lull ? 0.2 : 0.4)) + randInt(-1, 2))
	);
	const monthlyActiveUsers = Math.min(
		totalUsers,
		Math.max(dailyActiveUsers, Math.round(totalUsers * 0.8) + randInt(-1, 2))
	);

	const dailyActiveRooms = Math.min(
		totalRooms,
		Math.max(0, Math.round(totalRooms * (burst ? 0.7 : lull ? 0.25 : 0.45)) + randInt(-1, 2))
	);

	const dailyMessages = Math.max(
		0,
		(burst ? randInt(25, 60) : lull ? randInt(0, 10) : randInt(8, 25))
	);
	const dailySentMessages = Math.max(0, dailyMessages - randInt(0, 5));
	const dailyE2eeMessages = Math.max(0, dailyMessages - randInt(0, 10));
	const dailySentE2eeMessages = Math.max(0, Math.min(dailySentMessages, dailyE2eeMessages));

	const bridged = Math.max(0, Math.min(totalUsers, basePayload.daily_user_type_bridged + randInt(-1, 2)));
	const totalNonBridged = Math.max(0, totalUsers - bridged);

	return {
		...basePayload,
		timestamp,
		cpu_average: Math.max(0, basePayload.cpu_average + randInt(0, 25) / 100),
		memory_rss: Math.max(1, basePayload.memory_rss + randInt(-5000, 15000)),
		total_users: totalUsers,
		total_room_count: totalRooms,
		total_nonbridged_users: totalNonBridged,
		daily_active_users: dailyActiveUsers,
		monthly_active_users: monthlyActiveUsers,
		daily_messages: dailyMessages,
		daily_sent_messages: dailySentMessages,
		daily_e2ee_messages: dailyE2eeMessages,
		daily_sent_e2ee_messages: dailySentE2eeMessages,
		daily_active_rooms: dailyActiveRooms,
		daily_user_type_bridged: bridged,
		daily_user_type_native: Math.max(0, totalNonBridged),
		uptime_seconds: Math.max(60, basePayload.uptime_seconds + (total - 1 - i) * 300)
	};
};

const db = new Database(dbPath);
const insert = db.prepare(`
	INSERT INTO usage_report (
		id,
		received_at,
		homeserver,
		server_context,
		total_users,
		total_room_count,
		daily_active_users,
		monthly_active_users,
		daily_messages,
		daily_sent_messages,
		daily_active_rooms,
		payload
	) VALUES (
		@id,
		@received_at,
		@homeserver,
		@server_context,
		@total_users,
		@total_room_count,
		@daily_active_users,
		@monthly_active_users,
		@daily_messages,
		@daily_sent_messages,
		@daily_active_rooms,
		@payload
	);
`);

const insertMany = db.transaction((rows) => {
	for (const row of rows) insert.run(row);
});

const rows = [];
let totals = {
	totalUsers: basePayload.total_users,
	totalRooms: basePayload.total_room_count
};

for (let i = 0; i < count; i += 1) {
	const payload = makePayload(i, count, totals);
	totals = {
		totalUsers: payload.total_users,
		totalRooms: payload.total_room_count
	};
	rows.push({
		id: crypto.randomUUID(),
		received_at: payload.timestamp * 1000,
		homeserver: payload.homeserver,
		server_context: payload.server_context,
		total_users: payload.total_users,
		total_room_count: payload.total_room_count,
		daily_active_users: payload.daily_active_users,
		monthly_active_users: payload.monthly_active_users,
		daily_messages: payload.daily_messages,
		daily_sent_messages: payload.daily_sent_messages,
		daily_active_rooms: payload.daily_active_rooms,
		payload: JSON.stringify(payload)
	});
}

insertMany(rows);
console.log(`Seeded ${rows.length} usage_report rows into ${dbPath}.`);
