import type { RequestHandler } from './$types';
import { dev } from '$app/environment';
import {
	checkAdmin,
	encodeSession,
	exchangeCodeForTokens,
	fetchUserIdFromSynapse,
	getSessionCookieName
} from '$lib/server/auth';

const STATE_COOKIE = 'mh_auth_state';
const VERIFIER_COOKIE = 'mh_auth_verifier';
const NONCE_COOKIE = 'mh_auth_nonce';

export const GET: RequestHandler = async ({ cookies, url }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	if (!code || !state) {
		return new Response('Missing code or state', { status: 400 });
	}

	const storedState = cookies.get(STATE_COOKIE);
	const codeVerifier = cookies.get(VERIFIER_COOKIE);
	if (!storedState || !codeVerifier || storedState !== state) {
		return new Response('Invalid state', { status: 400 });
	}

	cookies.delete(STATE_COOKIE, { path: '/' });
	cookies.delete(VERIFIER_COOKIE, { path: '/' });
	cookies.delete(NONCE_COOKIE, { path: '/' });

	const tokens = await exchangeCodeForTokens({ code, codeVerifier });
	const accessToken = tokens.access_token;
	if (!accessToken) {
		return new Response('Missing access token', { status: 400 });
	}

	const userId = await fetchUserIdFromSynapse(accessToken);
	const isAdmin = await checkAdmin(accessToken, userId);
	if (!isAdmin) {
		cookies.delete(getSessionCookieName(), { path: '/' });
		return new Response(null, {
			status: 302,
			headers: { location: `/access-denied?user=${encodeURIComponent(userId)}` }
		});
	}

	const expiresAt = tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : undefined;
	const session = encodeSession({
		accessToken,
		refreshToken: tokens.refresh_token,
		expiresAt,
		userId,
		isAdmin
	});

	cookies.set(getSessionCookieName(), session, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev
	});

	return new Response(null, {
		status: 302,
		headers: { location: '/' }
	});
};
