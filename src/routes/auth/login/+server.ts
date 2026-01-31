import type { RequestHandler } from './$types';
import { dev } from '$app/environment';
import {
	buildAuthorizeUrl,
	generateCodeChallenge,
	generateRandom,
	getSessionCookieName
} from '$lib/server/auth';

const STATE_COOKIE = 'mh_auth_state';
const VERIFIER_COOKIE = 'mh_auth_verifier';
const NONCE_COOKIE = 'mh_auth_nonce';

export const GET: RequestHandler = async ({ cookies }) => {
	const state = generateRandom();
	const nonce = generateRandom();
	const codeVerifier = generateRandom(48);
	const codeChallenge = generateCodeChallenge(codeVerifier);

	const cookieBase = { path: '/', httpOnly: true, sameSite: 'lax', secure: !dev };
	cookies.set(STATE_COOKIE, state, cookieBase);
	cookies.set(NONCE_COOKIE, nonce, cookieBase);
	cookies.set(VERIFIER_COOKIE, codeVerifier, cookieBase);
	cookies.delete(getSessionCookieName(), { path: '/' });

	const url = await buildAuthorizeUrl({ state, nonce, codeChallenge });
	return new Response(null, {
		status: 302,
		headers: { location: url }
	});
};
