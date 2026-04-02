<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import {
		checkWebGPU,
		loadModel,
		transcribe,
		decodeAudioFile,
		getAudioDuration,
		type TranscriberProgress
	} from '$lib/transcriber';
	import { createTranscript, saveAudioBlob } from '$lib/db';
	import { LANGUAGES } from '$lib/types';

	let language = $state('de');
	let modelProgress = $state<TranscriberProgress>({
		status: 'idle',
		progress: 0,
		statusText: '',
		error: null
	});
	let isTranscribing = $state(false);
	let streamedText = $state('');
	let isDragging = $state(false);
	let isRecording = $state(false);
	let webgpuSupported = $state(true);
	let audioFile = $state<File | null>(null);

	let fileInputRef = $state<HTMLInputElement>(null!);
	let mediaRecorder: MediaRecorder | null = null;
	let audioChunks: Blob[] = [];
	let outputRef = $state<HTMLDivElement>(null!);

	onMount(() => {
		webgpuSupported = checkWebGPU();
	});

	async function ensureModelLoaded() {
		if (modelProgress.status === 'ready') return;
		await loadModel((p) => {
			modelProgress = p;
		});
	}

	async function handleFile(file: File) {
		audioFile = file;
		streamedText = '';
		isTranscribing = true;

		try {
			await ensureModelLoaded();
			const audioData = await decodeAudioFile(file);
			const audioDuration = getAudioDuration(audioData);
			const startTime = performance.now();

			const finalText = await transcribe(audioData, language, (token) => {
				streamedText += token;
			});

			const transcriptionTime = (performance.now() - startTime) / 1000;
			const id = crypto.randomUUID();

			await createTranscript({
				id,
				title: file.name.replace(/\.[^/.]+$/, ''),
				text: finalText,
				language,
				createdAt: Date.now(),
				updatedAt: Date.now(),
				audioDuration,
				transcriptionTime,
				audioFileName: file.name
			});

			await saveAudioBlob(id, file, file.type);
			goto(`/transcript/${id}`);
		} catch (err) {
			streamedText = `Error: ${err instanceof Error ? err.message : 'Transcription failed'}`;
			isTranscribing = false;
		}
	}

	function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) handleFile(file);
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		const file = e.dataTransfer?.files?.[0];
		if (file) handleFile(file);
	}

	async function startRecording() {
		isRecording = true;
		streamedText = '';
		audioChunks = [];

		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			mediaRecorder = new MediaRecorder(stream);

			mediaRecorder.ondataavailable = (e) => {
				if (e.data.size > 0) audioChunks.push(e.data);
			};

			mediaRecorder.onstop = async () => {
				stream.getTracks().forEach((t) => t.stop());
				isRecording = false;
				isTranscribing = true;

				try {
					const blob = new Blob(audioChunks, { type: 'audio/webm' });
					await ensureModelLoaded();
					const audioData = await decodeAudioFile(blob);
					const audioDuration = getAudioDuration(audioData);
					const startTime = performance.now();

					const finalText = await transcribe(audioData, language, (token) => {
						streamedText += token;
					});

					const transcriptionTime = (performance.now() - startTime) / 1000;
					const id = crypto.randomUUID();
					const title = `Aufnahme ${new Date().toLocaleString('de-DE')}`;

					await createTranscript({
						id,
						title,
						text: finalText,
						language,
						createdAt: Date.now(),
						updatedAt: Date.now(),
						audioDuration,
						transcriptionTime,
						audioFileName: null
					});

					await saveAudioBlob(id, blob, 'audio/webm');
					goto(`/transcript/${id}`);
				} catch (err) {
					streamedText = `Error: ${err instanceof Error ? err.message : 'Transcription failed'}`;
					isTranscribing = false;
				}
			};

			mediaRecorder.start();
		} catch {
			isRecording = false;
			streamedText = 'Error: Microphone access denied';
		}
	}

	function stopRecording() {
		mediaRecorder?.stop();
	}
</script>

<div class="space-y-6">
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
		<h1 class="text-2xl font-bold text-slate-800">Neue Transkription</h1>
	</div>

	{#if !webgpuSupported}
		<!-- WebGPU not supported error -->
		<div class="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
			<svg class="mx-auto mb-3 h-10 w-10 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="12" cy="12" r="10" />
				<line x1="15" y1="9" x2="9" y2="15" />
				<line x1="9" y1="9" x2="15" y2="15" />
			</svg>
			<h2 class="text-lg font-semibold text-red-700">WebGPU nicht verfügbar</h2>
			<p class="mt-2 text-sm text-red-600">
				Diese App benötigt WebGPU, um das Transkriptionsmodell lokal auszuführen. Bitte verwende eine aktuelle Version von Chrome oder Edge.
			</p>
		</div>
	{:else if isTranscribing || (modelProgress.status === 'loading')}
		<!-- Transcribing / Loading state -->
		<div class="rounded-xl border border-slate-200 bg-white p-6">
			{#if modelProgress.status === 'loading' && modelProgress.progress < 100}
				<div class="mb-6">
					<div class="mb-2 flex items-center justify-between text-sm">
						<span class="font-medium text-slate-700">Modell wird geladen...</span>
						<span class="text-slate-500">{modelProgress.progress}%</span>
					</div>
					<div class="h-2 overflow-hidden rounded-full bg-slate-100">
						<div
							class="h-full rounded-full bg-violet-500 transition-all duration-300"
							style="width: {modelProgress.progress}%"
						></div>
					</div>
					<p class="mt-1 text-xs text-slate-400">{modelProgress.statusText}</p>
				</div>
			{/if}

			{#if streamedText || isTranscribing}
				<div class="mb-3 flex items-center gap-2">
					<div class="h-2 w-2 animate-pulse rounded-full bg-violet-500"></div>
					<span class="text-sm font-medium text-slate-600">Transkribiere...</span>
				</div>
				<div
					bind:this={outputRef}
					class="max-h-96 overflow-y-auto rounded-lg bg-slate-50 p-4 font-mono text-sm text-slate-700"
				>
					{streamedText || 'Warte auf Transkription...'}
				</div>
			{/if}
		</div>
	{:else if isRecording}
		<!-- Recording state -->
		<div class="rounded-xl border border-red-200 bg-white p-8 text-center">
			<div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
				<div class="h-4 w-4 animate-pulse rounded-full bg-red-500"></div>
			</div>
			<h2 class="text-lg font-semibold text-slate-800">Aufnahme...</h2>
			<p class="mt-1 text-sm text-slate-500">Klicke auf Stopp, wenn du fertig bist</p>
			<button
				onclick={stopRecording}
				class="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
			>
				<svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
					<rect x="6" y="6" width="12" height="12" rx="1" />
				</svg>
				Stop
			</button>
		</div>
	{:else}
		<!-- Input selection -->
		<div class="space-y-4">
			<!-- Language selector -->
			<div class="rounded-xl border border-slate-200 bg-white p-4">
				<label for="language" class="mb-1.5 block text-sm font-medium text-slate-700">Sprache</label>
				<select
					id="language"
					bind:value={language}
					class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400"
				>
					{#each LANGUAGES as lang}
						<option value={lang.code}>{lang.flag} {lang.label} ({lang.native})</option>
					{/each}
				</select>
			</div>

			<!-- Upload + Record cards -->
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<!-- File upload -->
				<button
					onclick={() => fileInputRef.click()}
					onkeydown={(e) => e.key === 'Enter' && fileInputRef.click()}
					ondragover={(e) => { e.preventDefault(); isDragging = true; }}
					ondragleave={() => (isDragging = false)}
					ondrop={handleDrop}
					class="group flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-all
						{isDragging ? 'border-violet-400 bg-violet-50' : 'border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/50'}"
				>
					<div class="rounded-full bg-violet-100 p-3 text-violet-600 transition-colors group-hover:bg-violet-200">
						<svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
							<polyline points="17 8 12 3 7 8" />
							<line x1="12" y1="3" x2="12" y2="15" />
						</svg>
					</div>
					<div class="text-center">
						<span class="block font-medium text-slate-700">Datei hochladen</span>
						<span class="text-xs text-slate-400">oder Audio hierher ziehen</span>
					</div>
				</button>

				<input
					bind:this={fileInputRef}
					type="file"
					accept="audio/*,video/*"
					onchange={handleFileSelect}
					class="hidden"
				/>

				<!-- Record -->
				<button
					onclick={startRecording}
					class="group flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-white p-8 transition-all hover:border-violet-300 hover:bg-violet-50/50"
				>
					<div class="rounded-full bg-violet-100 p-3 text-violet-600 transition-colors group-hover:bg-violet-200">
						<svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
							<path d="M19 10v2a7 7 0 0 1-14 0v-2" />
							<line x1="12" y1="19" x2="12" y2="23" />
							<line x1="8" y1="23" x2="16" y2="23" />
						</svg>
					</div>
					<div class="text-center">
						<span class="block font-medium text-slate-700">Audio aufnehmen</span>
						<span class="text-xs text-slate-400">Mikrofon verwenden</span>
					</div>
				</button>
			</div>
		</div>
	{/if}
</div>
