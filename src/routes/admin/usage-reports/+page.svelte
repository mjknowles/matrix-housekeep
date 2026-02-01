<script lang="ts">
	import { onMount } from 'svelte';

	type ReportPoint = {
		receivedAt: number | null;
		totalUsers: number | null;
		totalRoomCount: number | null;
		dailyActiveUsers: number | null;
		monthlyActiveUsers: number | null;
		dailyMessages: number | null;
		dailySentMessages: number | null;
		dailyActiveRooms: number | null;
		dailyE2eeMessages: number | null;
		dailySentE2eeMessages: number | null;
		dailyActiveE2eeRooms: number | null;
		dailyUserTypeNative: number | null;
		dailyUserTypeBridged: number | null;
		dailyUserTypeGuest: number | null;
		cpuAverage: number | null;
		memoryRss: number | null;
		cacheFactor: number | null;
		eventCacheSize: number | null;
		r30v2UsersAll: number | null;
		r30v2UsersAndroid: number | null;
		r30v2UsersElectron: number | null;
		r30v2UsersIos: number | null;
		r30v2UsersWeb: number | null;
	};

	let { data } = $props();
	const rows = $derived(data?.rows ?? []);
	let activePayload = $state<{ id: string; body: string } | null>(null);
	let copyStatus = $state<'idle' | 'ok' | 'error'>('idle');
	const reportSeries = $derived(
		(((data?.reports && data.reports.length > 0 ? data.reports : data?.rows) as ReportPoint[]) ??
			[])
	);
	const reportCount = $derived(reportSeries.length);
	let messagesOptions = $state<Record<string, unknown> | null>(null);
	let usersOptions = $state<Record<string, unknown> | null>(null);
	let ChartComponent = $state<
		null | ((props: { options: Record<string, unknown>; init: unknown; class?: string }) => unknown)
	>(null);
	let initFn = $state<unknown>(null);
	let chartError = $state<string | null>(null);

	const formatDate = (value: number | Date | null) => {
		if (!value) return '—';
		const date = typeof value === 'number' ? new Date(value) : value;
		return new Intl.DateTimeFormat('en-US', {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(date);
	};

	const formatPayload = (raw: string) => {
		try {
			return JSON.stringify(JSON.parse(raw), null, 2);
		} catch {
			return raw;
		}
	};

	const formatAxisTime = (value: number | string | null) => {
		if (!value) return '';
		const date = new Date(value);
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		}).format(date);
	};

	const buildOptions = (reports: ReportPoint[]) => {
		const labels = reports.map((report) => formatAxisTime(report.receivedAt));

		const series = (label: string, key: keyof ReportPoint) => ({
			name: label,
			type: 'line',
			smooth: true,
			showSymbol: false,
			data: reports.map((report) => report[key])
		});

		messagesOptions = {
			tooltip: { trigger: 'axis' },
			legend: { top: 0 },
			grid: { left: 40, right: 20, top: 40, bottom: 40 },
			xAxis: { type: 'category', data: labels },
			yAxis: { type: 'value' },
			series: [
				series('Daily messages', 'dailyMessages'),
				series('Daily sent', 'dailySentMessages'),
				series('Daily e2ee', 'dailyE2eeMessages'),
				series('Daily sent e2ee', 'dailySentE2eeMessages')
			]
		};

		usersOptions = {
			tooltip: { trigger: 'axis' },
			legend: { top: 0 },
			grid: { left: 40, right: 20, top: 40, bottom: 40 },
			xAxis: { type: 'category', data: labels },
			yAxis: { type: 'value' },
			series: [
				series('Total users', 'totalUsers'),
				series('Total rooms', 'totalRoomCount'),
				series('DAU', 'dailyActiveUsers'),
				series('MAU', 'monthlyActiveUsers')
			]
		};
	};

	const copyPayload = async () => {
		if (!activePayload) return;
		try {
			await navigator.clipboard.writeText(activePayload.body);
			copyStatus = 'ok';
			setTimeout(() => {
				copyStatus = 'idle';
			}, 1500);
		} catch {
			copyStatus = 'error';
		}
	};

	onMount(async () => {
		try {
			const [{ Chart }, { init, use }, charts, components, renderers] = await Promise.all([
				import('svelte-echarts'),
				import('echarts/core'),
				import('echarts/charts'),
				import('echarts/components'),
				import('echarts/renderers')
			]);

			use([
				charts.LineChart,
				components.GridComponent,
				components.TooltipComponent,
				components.LegendComponent,
				renderers.CanvasRenderer
			]);

			ChartComponent = Chart as typeof ChartComponent;
			initFn = init;
			buildOptions(reportSeries);
		} catch {
			chartError = 'Charts failed to load. Check the console for module errors.';
		}
	});

	$effect(() => {
		buildOptions(reportSeries);
	});
</script>

<section class="panel">
	<div class="header">
		<h1>Usage trends</h1>
		<span class="meta">Latest report and recent activity</span>
	</div>

	{#if reportCount === 0}
		<p class="empty">No chart data yet.</p>
	{:else}
		<div class="chart-grid">
			<div class="chart-card">
				<h2>Message volume</h2>
				{#if ChartComponent && initFn && messagesOptions}
					<div class="chart-wrap">
						<svelte:component
							this={ChartComponent}
							options={messagesOptions}
							init={initFn}
							class="chart"
						/>
					</div>
				{:else if chartError}
					<p class="empty">{chartError}</p>
				{:else}
					<p class="empty">Loading chart… ({reportCount} reports)</p>
				{/if}
			</div>
			<div class="chart-card">
				<h2>Users & rooms</h2>
				{#if ChartComponent && initFn && usersOptions}
					<div class="chart-wrap">
						<svelte:component
							this={ChartComponent}
							options={usersOptions}
							init={initFn}
							class="chart"
						/>
					</div>
				{:else if chartError}
					<p class="empty">{chartError}</p>
				{:else}
					<p class="empty">Loading chart… ({reportCount} reports)</p>
				{/if}
			</div>
		</div>
	{/if}
</section>

<section class="panel">
	<div class="header">
		<h1>Usage reports</h1>
		<span class="meta">Most recent 10 reports</span>
	</div>

	{#if rows.length === 0}
		<p class="empty">No reports received yet.</p>
	{:else}
		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th>Received</th>
						<th>Homeserver</th>
						<th>Context</th>
						<th>Total users</th>
						<th>Total rooms</th>
						<th>DAU</th>
						<th>Daily messages</th>
						<th>Payload</th>
					</tr>
				</thead>
				<tbody>
					{#each rows as row}
						<tr>
							<td>{formatDate(row.receivedAt)}</td>
							<td>{row.homeserver ?? '—'}</td>
							<td>{row.serverContext ?? '—'}</td>
							<td>{row.totalUsers ?? '—'}</td>
							<td>{row.totalRoomCount ?? '—'}</td>
							<td>{row.dailyActiveUsers ?? '—'}</td>
							<td>{row.dailyMessages ?? '—'}</td>
							<td>
								<button
									type="button"
									class="payload-button"
									on:click={() =>
										(activePayload = { id: row.id, body: formatPayload(row.payload) })
									}
								>
									View
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>

{#if activePayload}
	<div
		class="modal-backdrop"
		role="button"
		tabindex="0"
		on:click={() => (activePayload = null)}
		on:keydown={(event) => {
			if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
				activePayload = null;
			}
		}}
	>
		<div
			class="modal"
			role="dialog"
			aria-modal="true"
			aria-label="Usage report payload"
			on:click={(event) => event.stopPropagation()}
		>
			<header class="modal-header">
				<h2>Raw payload</h2>
				<div class="modal-actions">
					<button type="button" class="ghost" on:click={copyPayload}>
						{copyStatus === 'ok' ? 'Copied' : copyStatus === 'error' ? 'Copy failed' : 'Copy'}
					</button>
					<button type="button" class="close" on:click={() => (activePayload = null)}>Close</button>
				</div>
			</header>
			<pre>{activePayload.body}</pre>
		</div>
	</div>
{/if}

<style>
	.panel {
		background: #fff;
		border-radius: 16px;
		padding: 2rem;
		box-shadow: 0 18px 40px rgba(0, 0, 0, 0.08);
	}

	.header {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
	}

	h1 {
		margin: 0;
		font-size: 2rem;
	}

	.meta {
		color: #5c5c5c;
	}

	.chart-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
		gap: 1.5rem;
	}

	.chart-card {
		background: #f8f7f4;
		border-radius: 16px;
		padding: 1.5rem;
		box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.04);
	}

	.chart-card h2 {
		margin: 0 0 0.75rem;
		font-size: 1.05rem;
	}

	.chart-wrap {
		height: 260px;
		width: 100%;
		overflow: hidden;
	}

	.chart {
		height: 100%;
		width: 100%;
		display: block;
	}

	.empty {
		margin: 0;
		font-size: 1rem;
		color: #444;
	}

	.table-wrap {
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.92rem;
		min-width: 880px;
	}

	th,
	td {
		text-align: left;
		padding: 0.75rem 0.8rem;
		border-bottom: 1px solid #ececec;
	}

	th {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #666;
	}

	.payload-button {
		padding: 0.35rem 0.7rem;
		border-radius: 999px;
		border: 1px solid #d2d2d2;
		background: #f7f7f7;
		cursor: pointer;
		font-size: 0.8rem;
	}

	pre {
		margin: 0.6rem 0 0;
		padding: 0.75rem;
		background: #f3f3f3;
		border-radius: 8px;
		max-width: 400px;
		max-height: 240px;
		overflow: auto;
		font-size: 0.75rem;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(12, 12, 12, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.5rem;
		z-index: 1000;
	}

	.modal {
		background: #fff;
		border-radius: 16px;
		max-width: min(860px, 100%);
		width: 100%;
		padding: 1.5rem;
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.2);
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.4rem;
	}

	.modal-actions {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.ghost {
		border: 1px solid #d2d2d2;
		background: #fff;
		color: #111;
		padding: 0.35rem 0.75rem;
		border-radius: 999px;
		cursor: pointer;
		font-size: 0.8rem;
	}

	.close {
		border: none;
		background: #111;
		color: #fff;
		padding: 0.35rem 0.75rem;
		border-radius: 999px;
		cursor: pointer;
		font-size: 0.8rem;
	}

	@media (max-width: 720px) {
		.panel {
			padding: 1.5rem;
		}

		.chart-wrap {
			height: 220px;
		}

		table {
			font-size: 0.85rem;
			min-width: 720px;
		}
	}
</style>
