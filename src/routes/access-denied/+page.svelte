<script lang="ts">
	let { data } = $props();
</script>

<section class="card">
	<h1>Access denied</h1>
	<p>You're signed in, but this account doesn't have Housekeep admin access.</p>
	{#if data.user}
		<p class="user">Signed in as <span>{data.user}</span></p>
	{/if}
	<div class="steps">
		<p>Ask an existing admin to:</p>
		<ul>
			<li>Grant you admin privileges in Synapse, and</li>
			<li>Ensure your MAS account can request admin scope.</li>
		</ul>
	</div>
	<a class="link" href="/auth/logout">Sign out</a>
</section>

<style>
	.card {
		max-width: 560px;
		padding: 2rem;
		background: #fff;
		border-radius: 12px;
		box-shadow: 0 18px 40px rgba(0, 0, 0, 0.08);
	}

	h1 {
		margin: 0 0 0.75rem;
		font-size: 2rem;
	}

	p {
		margin: 0 0 0.75rem;
		line-height: 1.6;
	}

	.user span {
		font-weight: 600;
	}

	.steps {
		margin-top: 1rem;
		padding: 1rem;
		background: #f6f2ea;
		border-radius: 10px;
	}

	ul {
		margin: 0.5rem 0 0;
		padding-left: 1.2rem;
	}

	.link {
		display: inline-block;
		margin-top: 1rem;
		color: #111;
		text-decoration: none;
		border-bottom: 1px solid rgba(0, 0, 0, 0.4);
	}
</style>
