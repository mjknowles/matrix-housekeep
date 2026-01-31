import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const user = url.searchParams.get('user');
	return { user };
};
