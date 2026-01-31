import type { Handle } from '@sveltejs/kit';
import { decodeSession, getSessionCookieName } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
	const session = decodeSession(event.cookies.get(getSessionCookieName()));
	if (session?.expiresAt && session.expiresAt < Date.now()) {
		event.cookies.delete(getSessionCookieName(), { path: '/' });
		event.locals.session = undefined;
	} else {
		event.locals.session = session ?? undefined;
	}

	return resolve(event);
};
