import { env } from '$env/dynamic/private';
import { createHash, randomBytes } from 'node:crypto';

export type Session = {
	accessToken: string;
	refreshToken?: string;
	expiresAt?: number;
	userId: string;
	isAdmin: boolean;
};

type OidcDiscovery = {
	authorization_endpoint: string;
	token_endpoint: string;
};

const SESSION_COOKIE = 'mh_session';

let discoveryCache: { value: OidcDiscovery; fetchedAt: number } | null = null;

function requireEnv(name: string): string {
	const value = env[name];
	if (!value) throw new Error(`${name} is not set`);
	return value;
}

function baseUrlNoSlash(url: string): string {
	return url.endsWith('/') ? url.slice(0, -1) : url;
}

export function getSessionCookieName(): string {
	return SESSION_COOKIE;
}

export function encodeSession(session: Session): string {
	return Buffer.from(JSON.stringify(session)).toString('base64url');
}

export function decodeSession(raw: string | undefined): Session | null {
	if (!raw) return null;
	try {
		const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as Session;
		if (!parsed?.accessToken || !parsed?.userId) return null;
		return parsed;
	} catch {
		return null;
	}
}

export function generateRandom(size = 32): string {
	return randomBytes(size).toString('base64url');
}

export function generateCodeChallenge(verifier: string): string {
	return createHash('sha256').update(verifier).digest('base64url');
}

export async function getOidcDiscovery(): Promise<OidcDiscovery> {
	const issuer = baseUrlNoSlash(requireEnv('MAS_ISSUER'));
	const discoveryUrl = env.MAS_DISCOVERY_URL
		? env.MAS_DISCOVERY_URL
		: `${issuer}/.well-known/openid-configuration`;
	const now = Date.now();
	if (discoveryCache && now - discoveryCache.fetchedAt < 5 * 60 * 1000) {
		return discoveryCache.value;
	}

	const res = await fetch(discoveryUrl);
	if (!res.ok) throw new Error(`Failed to load OIDC discovery: ${res.status}`);
	const json = (await res.json()) as OidcDiscovery;
	if (!json.authorization_endpoint || !json.token_endpoint) {
		throw new Error('OIDC discovery missing required endpoints');
	}
	discoveryCache = { value: json, fetchedAt: now };
	return json;
}

export async function buildAuthorizeUrl(params: {
	state: string;
	nonce: string;
	codeChallenge: string;
}): Promise<string> {
	const { authorization_endpoint } = await getOidcDiscovery();
	const authEndpoint = env.MAS_AUTHORIZATION_ENDPOINT ?? authorization_endpoint;
	const clientId = requireEnv('MAS_CLIENT_ID');
	const redirectUri = requireEnv('MAS_REDIRECT_URI');
	const scope =
		env.MAS_SCOPE ??
		'openid urn:matrix:org.matrix.msc2967.client:api:* urn:synapse:admin:*';

	const url = new URL(authEndpoint);
	url.searchParams.set('client_id', clientId);
	url.searchParams.set('redirect_uri', redirectUri);
	url.searchParams.set('response_type', 'code');
	url.searchParams.set('scope', scope);
	url.searchParams.set('state', params.state);
	url.searchParams.set('nonce', params.nonce);
	url.searchParams.set('code_challenge', params.codeChallenge);
	url.searchParams.set('code_challenge_method', 'S256');
	return url.toString();
}

export async function exchangeCodeForTokens(params: {
	code: string;
	codeVerifier: string;
}): Promise<{
	access_token: string;
	refresh_token?: string;
	expires_in?: number;
}> {
	const { token_endpoint } = await getOidcDiscovery();
	const tokenEndpoint = env.MAS_TOKEN_ENDPOINT ?? token_endpoint;
	const clientId = requireEnv('MAS_CLIENT_ID');
	const redirectUri = requireEnv('MAS_REDIRECT_URI');
	const clientSecret = env.MAS_CLIENT_SECRET;

	const body = new URLSearchParams({
		grant_type: 'authorization_code',
		code: params.code,
		redirect_uri: redirectUri,
		client_id: clientId,
		code_verifier: params.codeVerifier
	});
	if (clientSecret) body.set('client_secret', clientSecret);

	const res = await fetch(tokenEndpoint, {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Token exchange failed: ${res.status} ${text}`);
	}
	return (await res.json()) as {
		access_token: string;
		refresh_token?: string;
		expires_in?: number;
	};
}

export async function fetchUserIdFromSynapse(accessToken: string): Promise<string> {
	const base = baseUrlNoSlash(requireEnv('SYNAPSE_BASE_URL'));
	const res = await fetch(`${base}/_matrix/client/v3/account/whoami`, {
		headers: { Authorization: `Bearer ${accessToken}` }
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Synapse whoami failed: ${res.status} ${text}`);
	}
	const json = (await res.json()) as { user_id?: string };
	if (!json.user_id) throw new Error('Synapse whoami missing user_id');
	return json.user_id;
}

export async function checkAdmin(accessToken: string, userId: string): Promise<boolean> {
	const base = baseUrlNoSlash(requireEnv('SYNAPSE_BASE_URL'));
	const url = `${base}/_synapse/admin/v2/users/${encodeURIComponent(userId)}`;
	const res = await fetch(url, {
		headers: { Authorization: `Bearer ${accessToken}` }
	});
	if (!res.ok) {
		return false;
	}
	const json = (await res.json()) as { admin?: number | boolean };
	return Boolean(json.admin);
}
