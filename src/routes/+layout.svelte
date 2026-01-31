<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';

	let { data, children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="shell">
	<header class="topbar">
		<div class="brand">Matrix Housekeep</div>
		<nav class="auth">
			{#if data.user}
				<span class="user">{data.user.userId}</span>
				<span class="pill">{data.user.isAdmin ? 'admin' : 'viewer'}</span>
				<a class="link" href="/auth/logout">Sign out</a>
			{:else}
				<a class="link" href="/auth/login">Sign in</a>
			{/if}
		</nav>
	</header>

	<main class="content">
		{@render children()}
	</main>
</div>

<style>
	:global(body) {
		margin: 0;
		font-family: 'IBM Plex Sans', system-ui, sans-serif;
		background: #f5f4f0;
		color: #1e1e1e;
	}

	.shell {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.topbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.5rem;
		background: #111;
		color: #fff;
	}

	.brand {
		font-weight: 700;
		letter-spacing: 0.02em;
	}

	.auth {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.9rem;
	}

	.user {
		opacity: 0.85;
	}

	.pill {
		padding: 0.15rem 0.5rem;
		border-radius: 999px;
		background: #2f2f2f;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.link {
		color: #fff;
		text-decoration: none;
		border-bottom: 1px solid rgba(255, 255, 255, 0.4);
	}

	.content {
		flex: 1;
		padding: 2rem 1.5rem;
	}
</style>
