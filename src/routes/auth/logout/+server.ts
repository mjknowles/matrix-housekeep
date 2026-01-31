import type { RequestHandler } from './$types';
import { getSessionCookieName } from '$lib/server/auth';

export const GET: RequestHandler = async ({ cookies }) => {
	cookies.delete(getSessionCookieName(), { path: '/' });
	return new Response(null, {
		status: 302,
		headers: { location: '/' }
	});
};
