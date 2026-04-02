<script lang="ts">
	import { onMount } from 'svelte';
	import { listTranscripts, deleteTranscript, updateTranscript, cleanupExpiredAudio } from '$lib/db';
	import { getLanguage, formatDuration, formatRelativeTime } from '$lib/types';
	import type { Transcript } from '$lib/types';

	let transcripts = $state<Transcript[]>([]);
	let loading = $state(true);
	let confirmDeleteId = $state<string | null>(null);
	let renamingId = $state<string | null>(null);
	let renameValue = $state('');

	onMount(async () => {
		await cleanupExpiredAudio();
		transcripts = await listTranscripts();
		loading = false;
	});

	async function handleDelete(id: string) {
		await deleteTranscript(id);
		transcripts = transcripts.filter((t) => t.id !== id);
		confirmDeleteId = null;
	}

	function startRename(transcript: Transcript) {
		renamingId = transcript.id;
		renameValue = transcript.title;
	}

	async function saveRename(id: string) {
		const trimmed = renameValue.trim();
		if (!trimmed) {
			renamingId = null;
			return;
		}
		await updateTranscript(id, { title: trimmed });
		transcripts = transcripts.map((t) =>
			t.id === id ? { ...t, title: trimmed, updatedAt: Date.now() } : t
		);
		renamingId = null;
	}

	function handleRenameKeydown(e: KeyboardEvent, id: string) {
		if (e.key === 'Enter') {
			e.preventDefault();
			saveRename(id);
		} else if (e.key === 'Escape') {
			renamingId = null;
		}
	}
</script>

<div class="space-y-6">
	<!-- Intro section -->
	<div class="rounded-xl border border-violet-100 bg-violet-50/60 px-5 py-4">
		<p class="text-sm leading-relaxed text-slate-700">
			<strong>Audio-Transkribierer</strong> wandelt Audiodateien lokal in Text um — direkt in deinem Browser.
			Deine Dateien verlassen zu keinem Zeitpunkt deinen Computer. Die gesamte Verarbeitung geschieht
			auf deinem Gerät mithilfe eines KI-Modells, das einmalig heruntergeladen und im Browser
			zwischengespeichert wird.
		</p>
	</div>

	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-slate-800">Transkriptionen</h1>
			<p class="text-sm text-slate-500">Deine lokal verarbeiteten Audio-Transkripte</p>
		</div>
		<a
			href="/new"
			class="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-violet-700"
		>
			<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<line x1="12" y1="5" x2="12" y2="19" />
				<line x1="5" y1="12" x2="19" y2="12" />
			</svg>
			Neue Transkription
		</a>
	</div>

	{#if loading}
		<div class="flex justify-center py-20">
			<div class="h-8 w-8 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600"></div>
		</div>
	{:else if transcripts.length === 0}
		<div class="rounded-xl border border-dashed border-slate-300 bg-white py-20 text-center">
			<svg class="mx-auto mb-4 h-12 w-12 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
				<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
				<path d="M19 10v2a7 7 0 0 1-14 0v-2" />
				<line x1="12" y1="19" x2="12" y2="23" />
				<line x1="8" y1="23" x2="16" y2="23" />
			</svg>
			<h2 class="text-lg font-medium text-slate-600">Noch keine Transkriptionen</h2>
			<p class="mt-1 text-sm text-slate-400">Lade eine Audiodatei hoch oder nimm etwas auf</p>
			<a
				href="/new"
				class="mt-4 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700"
			>
				Los geht's
			</a>
		</div>
	{:else}
		<div class="space-y-3">
			{#each transcripts as transcript (transcript.id)}
				<div class="group relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
					<a href="/transcript/{transcript.id}" class="block">
						<div class="flex items-start justify-between">
							<div class="min-w-0 flex-1 pr-20">
								<div class="flex items-center gap-2">
									<span class="text-base">{getLanguage(transcript.language).flag}</span>
									{#if renamingId === transcript.id}
										<!-- svelte-ignore a11y_autofocus -->
										<input
											type="text"
											bind:value={renameValue}
											onkeydown={(e) => handleRenameKeydown(e, transcript.id)}
											onblur={() => saveRename(transcript.id)}
											onclick={(e) => e.preventDefault()}
											autofocus
											class="w-full rounded border border-violet-300 px-1.5 py-0.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-400"
										/>
									{:else}
										<h3 class="truncate font-medium text-slate-800">{transcript.title}</h3>
									{/if}
								</div>
								<p class="mt-1 line-clamp-2 text-sm text-slate-500">
									{transcript.text.slice(0, 200) || 'Leeres Transkript'}
								</p>
								<div class="mt-2 flex items-center gap-3 text-xs text-slate-400">
									<span>{formatRelativeTime(transcript.createdAt)}</span>
									<span>·</span>
									<span>{formatDuration(transcript.audioDuration)} Audio</span>
									<span>·</span>
									<span>{getLanguage(transcript.language).label}</span>
								</div>
							</div>
						</div>
					</a>

					<div class="absolute right-3 top-3 flex items-center gap-1">
						{#if confirmDeleteId === transcript.id}
							<div class="flex items-center gap-1.5">
								<button
									onclick={() => handleDelete(transcript.id)}
									class="rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
								>
									Löschen
								</button>
								<button
									onclick={() => (confirmDeleteId = null)}
									class="rounded-md bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100"
								>
									Abbrechen
								</button>
							</div>
						{:else}
							<button
								onclick={(e) => { e.preventDefault(); startRename(transcript); }}
								class="rounded-md p-1.5 text-slate-300 opacity-0 transition-all hover:bg-violet-50 hover:text-violet-500 group-hover:opacity-100"
								title="Umbenennen"
							>
								<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
									<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
								</svg>
							</button>
							<button
								onclick={() => (confirmDeleteId = transcript.id)}
								class="rounded-md p-1.5 text-slate-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
								title="Löschen"
							>
								<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<polyline points="3 6 5 6 21 6" />
									<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
								</svg>
							</button>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
