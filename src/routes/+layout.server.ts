import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	return {
		user: locals.session
			? {
					userId: locals.session.userId,
					isAdmin: locals.session.isAdmin
				}
			: null
	};
};
