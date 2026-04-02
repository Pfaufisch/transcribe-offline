<script lang="ts">
	import '../app.css';
	let { children } = $props();
</script>

<svelte:head>
	<title>Browser ASR</title>
	<meta name="description" content="Local audio transcription in your browser" />
</svelte:head>

<div class="min-h-screen bg-slate-50">
	<header class="border-b border-slate-200 bg-white">
		<div class="mx-auto flex max-w-4xl items-center px-4 py-3">
			<a href="/" class="flex items-center gap-2 text-lg font-semibold text-slate-800">
				<svg class="h-6 w-6 text-violet-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
					<path d="M19 10v2a7 7 0 0 1-14 0v-2" />
					<line x1="12" y1="19" x2="12" y2="23" />
					<line x1="8" y1="23" x2="16" y2="23" />
				</svg>
				Browser ASR
			</a>
		</div>
	</header>

	<main class="mx-auto max-w-4xl px-4 py-6">
		{@render children()}
	</main>
</div>
