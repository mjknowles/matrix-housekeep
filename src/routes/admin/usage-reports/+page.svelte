<script lang="ts">
	let { data } = $props();
	const rows = data?.rows ?? [];

	const formatDate = (value: number | Date | null) => {
		if (!value) return '—';
		const date = typeof value === 'number' ? new Date(value) : value;
		return new Intl.DateTimeFormat('en-US', {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(date);
	};
</script>

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
								<details>
									<summary>View</summary>
									<pre>{row.payload}</pre>
								</details>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>

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

	details summary {
		cursor: pointer;
		color: #1b4dff;
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

	@media (max-width: 720px) {
		.panel {
			padding: 1.5rem;
		}

		table {
			font-size: 0.85rem;
			min-width: 720px;
		}
	}
</style>
