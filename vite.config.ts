import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';

const skipBrowser = process.env.VITEST_SKIP_BROWSER === '1';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		host: true,
		allowedHosts: ['matrix-housekeep.ess.svc.cluster.local', 'matrix-housekeep']
	},
	test: {
		expect: { requireAssertions: true },
		projects: [
			...(skipBrowser
				? []
				: [
						{
							extends: './vite.config.ts',
							test: {
								name: 'client',
								browser: {
									enabled: true,
									provider: playwright(),
									instances: [{ browser: 'chromium', headless: true }]
								},
								include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
								exclude: ['src/lib/server/**']
							}
						}
					]),
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
