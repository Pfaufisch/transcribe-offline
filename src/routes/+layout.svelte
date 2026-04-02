<script lang="ts">
	import '../app.css';
	let { children } = $props();
</script>

<svelte:head>
	<title>Audio-Transkribierer</title>
	<meta name="description" content="Lokale Audio-Transkription direkt im Browser" />
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
				Audio-Transkribierer
			</a>
		</div>
	</header>

	<main class="mx-auto max-w-4xl px-4 py-6">
		{@render children()}
	</main>

	<footer class="mt-auto border-t border-slate-200 bg-white">
		<div class="mx-auto flex max-w-4xl items-center justify-center px-4 py-3">
			<a href="/storage" class="flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-violet-600">
				<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<ellipse cx="12" cy="5" rx="9" ry="3" />
					<path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
					<path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
				</svg>
				Datennutzung verwalten
			</a>
		</div>
	</footer>
</div>
