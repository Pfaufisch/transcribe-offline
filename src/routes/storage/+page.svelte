<script lang="ts">
	import { onMount } from 'svelte';
	import { listAudioBlobs, deleteAudioBlob, type AudioBlobInfo } from '$lib/db';
	import { listCachedModels, deleteCachedModel, type CachedModelInfo } from '$lib/cache';
	import { formatRelativeTime } from '$lib/types';

	let audioBlobs = $state<AudioBlobInfo[]>([]);
	let models = $state<CachedModelInfo[]>([]);
	let loading = $state(true);
	let confirmDeleteAudio = $state<string | null>(null);
	let confirmDeleteModel = $state<string | null>(null);

	onMount(async () => {
		await refresh();
		loading = false;
	});

	async function refresh() {
		[audioBlobs, models] = await Promise.all([listAudioBlobs(), listCachedModels()]);
	}

	function formatSize(bytes: number): string {
		if (bytes === 0) return '0 B';
		const units = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(1024));
		const value = bytes / Math.pow(1024, i);
		return `${value.toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
	}

	function totalAudioSize(): number {
		return audioBlobs.reduce((sum, a) => sum + a.size, 0);
	}

	function totalModelSize(): number {
		return models.reduce((sum, m) => sum + m.totalSize, 0);
	}

	async function handleDeleteAudio(transcriptId: string) {
		await deleteAudioBlob(transcriptId);
		audioBlobs = audioBlobs.filter((a) => a.transcriptId !== transcriptId);
		confirmDeleteAudio = null;
	}

	async function handleDeleteModel(modelName: string) {
		await deleteCachedModel(modelName);
		models = models.filter((m) => m.name !== modelName);
		confirmDeleteModel = null;
	}
</script>

<div class="space-y-8">
	<div class="flex items-center gap-3">
		<a
			href="/"
			class="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
			aria-label="Zurück"
		>
			<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M19 12H5" />
				<path d="M12 19l-7-7 7-7" />
			</svg>
		</a>
		<div>
			<h1 class="text-2xl font-bold text-slate-800">Datennutzung verwalten</h1>
			<p class="text-sm text-slate-500">Gespeicherte Audiodateien und heruntergeladene Modelle</p>
		</div>
	</div>

	{#if loading}
		<div class="flex justify-center py-20">
			<div class="h-8 w-8 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600"></div>
		</div>
	{:else}
		<!-- Summary -->
		<div class="grid grid-cols-2 gap-4">
			<div class="rounded-xl border border-slate-200 bg-white p-4">
				<div class="text-sm text-slate-500">Audiodateien</div>
				<div class="mt-1 text-2xl font-bold text-slate-800">{formatSize(totalAudioSize())}</div>
				<div class="mt-0.5 text-xs text-slate-400">{audioBlobs.length} {audioBlobs.length === 1 ? 'Datei' : 'Dateien'}</div>
			</div>
			<div class="rounded-xl border border-slate-200 bg-white p-4">
				<div class="text-sm text-slate-500">KI-Modelle</div>
				<div class="mt-1 text-2xl font-bold text-slate-800">{formatSize(totalModelSize())}</div>
				<div class="mt-0.5 text-xs text-slate-400">{models.length} {models.length === 1 ? 'Modell' : 'Modelle'}</div>
			</div>
		</div>

		<!-- Audio Files -->
		<section>
			<h2 class="mb-3 text-lg font-semibold text-slate-800">Audiodateien</h2>
			<p class="mb-4 text-sm text-slate-500">
				Audiodateien werden automatisch nach 24 Stunden gelöscht. Du kannst sie auch manuell entfernen.
			</p>

			{#if audioBlobs.length === 0}
				<div class="rounded-xl border border-dashed border-slate-300 bg-white py-8 text-center">
					<p class="text-sm text-slate-400">Keine Audiodateien gespeichert</p>
				</div>
			{:else}
				<div class="space-y-2">
					{#each audioBlobs as audio (audio.transcriptId)}
						<div class="group flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-2">
									<svg class="h-4 w-4 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path d="M9 18V5l12-2v13" />
										<circle cx="6" cy="18" r="3" />
										<circle cx="18" cy="16" r="3" />
									</svg>
									<span class="truncate text-sm font-medium text-slate-700">{audio.transcriptTitle}</span>
								</div>
								<div class="mt-0.5 flex items-center gap-3 pl-6 text-xs text-slate-400">
									<span>{formatSize(audio.size)}</span>
									<span>·</span>
									<span>{audio.mimeType}</span>
									<span>·</span>
									<span>{formatRelativeTime(audio.createdAt)}</span>
								</div>
							</div>
							<div class="ml-3 shrink-0">
								{#if confirmDeleteAudio === audio.transcriptId}
									<div class="flex items-center gap-1.5">
										<button
											onclick={() => handleDeleteAudio(audio.transcriptId)}
											class="rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
										>
											Löschen
										</button>
										<button
											onclick={() => (confirmDeleteAudio = null)}
											class="rounded-md bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
										>
											Abbrechen
										</button>
									</div>
								{:else}
									<button
										onclick={() => (confirmDeleteAudio = audio.transcriptId)}
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
		</section>

		<!-- Models -->
		<section>
			<h2 class="mb-3 text-lg font-semibold text-slate-800">KI-Modelle</h2>
			<p class="mb-4 text-sm text-slate-500">
				Modelle werden beim ersten Gebrauch heruntergeladen und im Browser zwischengespeichert.
				Das Löschen eines Modells erfordert einen erneuten Download bei der nächsten Nutzung.
			</p>

			{#if models.length === 0}
				<div class="rounded-xl border border-dashed border-slate-300 bg-white py-8 text-center">
					<p class="text-sm text-slate-400">Keine Modelle im Cache</p>
				</div>
			{:else}
				<div class="space-y-2">
					{#each models as model (model.name)}
						<div class="group flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-2">
									<svg class="h-4 w-4 shrink-0 text-violet-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
										<polyline points="3.27 6.96 12 12.01 20.73 6.96" />
										<line x1="12" y1="22.08" x2="12" y2="12" />
									</svg>
									<span class="truncate text-sm font-medium text-slate-700">{model.name}</span>
								</div>
								<div class="mt-0.5 flex items-center gap-3 pl-6 text-xs text-slate-400">
									<span>{formatSize(model.totalSize)}</span>
									<span>·</span>
									<span>{model.files.length} {model.files.length === 1 ? 'Datei' : 'Dateien'}</span>
								</div>
							</div>
							<div class="ml-3 shrink-0">
								{#if confirmDeleteModel === model.name}
									<div class="flex items-center gap-1.5">
										<button
											onclick={() => handleDeleteModel(model.name)}
											class="rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
										>
											Löschen
										</button>
										<button
											onclick={() => (confirmDeleteModel = null)}
											class="rounded-md bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
										>
											Abbrechen
										</button>
									</div>
								{:else}
									<button
										onclick={() => (confirmDeleteModel = model.name)}
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
		</section>
	{/if}
</div>
