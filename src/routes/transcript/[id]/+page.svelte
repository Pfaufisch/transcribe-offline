<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import { getTranscript, updateTranscript, deleteTranscript, getAudioBlob } from '$lib/db';
	import { getLanguage, formatDuration, formatDate } from '$lib/types';
	import type { Transcript } from '$lib/types';

	let transcript = $state<Transcript | null>(null);
	let loading = $state(true);
	let audioUrl = $state<string | null>(null);
	let audioExpired = $state(false);
	let editText = $state('');
	let copied = $state(false);
	let confirmDelete = $state(false);
	let isRenaming = $state(false);
	let renameValue = $state('');
	let saveTimeout: ReturnType<typeof setTimeout> | null = null;

	const id = $derived(page.params.id);

	onMount(async () => {
		const t = await getTranscript(id);
		if (!t) {
			goto('/');
			return;
		}
		transcript = t;
		editText = t.text;

		const audio = await getAudioBlob(id);
		if (audio) {
			audioUrl = URL.createObjectURL(audio.blob);
		} else {
			audioExpired = true;
		}

		loading = false;
	});

	onDestroy(() => {
		if (audioUrl) URL.revokeObjectURL(audioUrl);
		if (saveTimeout) clearTimeout(saveTimeout);
	});

	function handleTextInput(e: Event) {
		const target = e.target as HTMLTextAreaElement;
		editText = target.value;

		// Debounced auto-save
		if (saveTimeout) clearTimeout(saveTimeout);
		saveTimeout = setTimeout(async () => {
			await updateTranscript(id, { text: editText });
			if (transcript) transcript = { ...transcript, text: editText, updatedAt: Date.now() };
		}, 500);
	}

	function startRename() {
		if (!transcript) return;
		renameValue = transcript.title;
		isRenaming = true;
	}

	async function saveRename() {
		const trimmed = renameValue.trim();
		if (!trimmed || !transcript) {
			isRenaming = false;
			return;
		}
		await updateTranscript(id, { title: trimmed });
		transcript = { ...transcript, title: trimmed, updatedAt: Date.now() };
		isRenaming = false;
	}

	function handleRenameKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			saveRename();
		} else if (e.key === 'Escape') {
			isRenaming = false;
		}
	}

	async function copyToClipboard() {
		await navigator.clipboard.writeText(editText);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	function downloadText() {
		const blob = new Blob([editText], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${transcript?.title ?? 'transcript'}.txt`;
		a.click();
		URL.revokeObjectURL(url);
	}

	async function handleDelete() {
		await deleteTranscript(id);
		goto('/');
	}
</script>

{#if loading}
	<div class="flex justify-center py-20">
		<div class="h-8 w-8 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600"></div>
	</div>
{:else if transcript}
	<div class="space-y-6">
		<!-- Header -->
		<div class="flex items-start justify-between">
			<div class="flex items-center gap-3">
				<a
					href="/"
					class="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
					aria-label="Back to list"
				>
					<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M19 12H5" />
						<path d="M12 19l-7-7 7-7" />
					</svg>
				</a>
				<div>
					{#if isRenaming}
						<!-- svelte-ignore a11y_autofocus -->
						<input
							type="text"
							bind:value={renameValue}
							onkeydown={handleRenameKeydown}
							onblur={saveRename}
							autofocus
							class="rounded border border-violet-300 px-2 py-1 text-2xl font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-400"
						/>
					{:else}
						<div class="flex items-center gap-2">
							<h1 class="text-2xl font-bold text-slate-800">{transcript.title}</h1>
							<button
								onclick={startRename}
								class="rounded-md p-1 text-slate-300 transition-colors hover:bg-violet-50 hover:text-violet-500"
								title="Umbenennen"
							>
								<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
									<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
								</svg>
							</button>
						</div>
					{/if}
					<div class="mt-0.5 flex items-center gap-2 text-sm text-slate-400">
						<span>{getLanguage(transcript.language).flag} {getLanguage(transcript.language).label}</span>
						<span>·</span>
						<span>{formatDuration(transcript.audioDuration)} audio</span>
						<span>·</span>
						<span>{formatDate(transcript.createdAt)}</span>
					</div>
				</div>
			</div>

			<!-- Actions -->
			<div class="flex items-center gap-2">
				<button
					onclick={copyToClipboard}
					class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
				>
					{#if copied}
						<svg class="h-3.5 w-3.5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="20 6 9 17 4 12" />
						</svg>
						Copied!
					{:else}
						<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
							<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
						</svg>
						Kopieren
					{/if}
				</button>
				<button
					onclick={downloadText}
					class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
				>
					<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
						<polyline points="7 10 12 15 17 10" />
						<line x1="12" y1="15" x2="12" y2="3" />
					</svg>
					Download
				</button>
				{#if confirmDelete}
					<button
						onclick={handleDelete}
						class="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
					>
						Wirklich löschen
					</button>
					<button
						onclick={() => (confirmDelete = false)}
						class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-50"
					>
						Abbrechen
					</button>
				{:else}
					<button
						onclick={() => (confirmDelete = true)}
						class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600"
					>
						<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="3 6 5 6 21 6" />
							<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
						</svg>
						Löschen
					</button>
				{/if}
			</div>
		</div>

		<!-- Audio Player -->
		{#if audioUrl}
			<div class="rounded-xl border border-slate-200 bg-white p-4">
				<div class="mb-2 flex items-center gap-2 text-sm font-medium text-slate-600">
					<svg class="h-4 w-4 text-violet-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polygon points="5 3 19 12 5 21 5 3" />
					</svg>
					Audio-Player
				</div>
				<!-- svelte-ignore element_invalid_self_closing_tag -->
				<audio controls src={audioUrl} class="w-full" preload="metadata" />
			</div>
		{:else if audioExpired}
			<div class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
				<div class="flex items-center gap-2 text-sm text-amber-700">
					<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="10" />
						<line x1="12" y1="8" x2="12" y2="12" />
						<line x1="12" y1="16" x2="12.01" y2="16" />
					</svg>
					Audio ist abgelaufen (Dateien werden 24 Stunden aufbewahrt)
				</div>
			</div>
		{/if}

		<!-- Transcript Editor -->
		<div class="rounded-xl border border-slate-200 bg-white p-4">
			<div class="mb-2 flex items-center justify-between">
				<span class="text-sm font-medium text-slate-600">Transkript</span>
				<span class="text-xs text-slate-400">Wird beim Bearbeiten automatisch gespeichert</span>
			</div>
			<textarea
				value={editText}
				oninput={handleTextInput}
				class="min-h-[300px] w-full resize-y rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 focus:border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-300"
				placeholder="Transcript text..."
			></textarea>
		</div>

		<!-- Metadata -->
		<div class="rounded-xl border border-slate-200 bg-white p-4">
			<h3 class="mb-3 text-sm font-medium text-slate-600">Details</h3>
			<dl class="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
				<div>
					<dt class="text-slate-400">Sprache</dt>
					<dd class="font-medium text-slate-700">{getLanguage(transcript.language).label}</dd>
				</div>
				<div>
					<dt class="text-slate-400">Audiodauer</dt>
					<dd class="font-medium text-slate-700">{formatDuration(transcript.audioDuration)}</dd>
				</div>
				<div>
					<dt class="text-slate-400">Transkriptionszeit</dt>
					<dd class="font-medium text-slate-700">{formatDuration(transcript.transcriptionTime)}</dd>
				</div>
				<div>
					<dt class="text-slate-400">Geschwindigkeit</dt>
					<dd class="font-medium text-slate-700">{(transcript.audioDuration / transcript.transcriptionTime).toFixed(1)}x Echtzeit</dd>
				</div>
			</dl>
		</div>
	</div>
{/if}
