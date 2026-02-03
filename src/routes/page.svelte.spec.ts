import { beforeAll, describe, expect, it } from 'vitest';
import Page from './+page.svelte';

const skipBrowser = process.env.VITEST_SKIP_BROWSER === '1';
const describeIf = skipBrowser ? describe.skip : describe;
let page: typeof import('vitest/browser').page;
let render: typeof import('vitest-browser-svelte').render;

beforeAll(async () => {
	if (skipBrowser) return;
	({ page } = await import('vitest/browser'));
	({ render } = await import('vitest-browser-svelte'));
});

describeIf('/+page.svelte', () => {
	it('should render h1', async () => {
		if (skipBrowser) return;
		render(Page);
		
		const heading = page.getByRole('heading', { level: 1 });
		await expect.element(heading).toBeInTheDocument();
	});
});
