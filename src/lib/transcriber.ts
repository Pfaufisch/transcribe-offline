import {
	pipeline,
	TextStreamer,
	type AutomaticSpeechRecognitionPipeline,
	type AutomaticSpeechRecognitionOutput
} from '@huggingface/transformers';

const MODEL_ID = 'onnx-community/cohere-transcribe-03-2026-ONNX';
const AUDIO_SAMPLE_RATE = 16000;

export type TranscriberStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface TranscriberProgress {
	status: TranscriberStatus;
	progress: number;
	statusText: string;
	error: string | null;
}

let pipelineInstance: AutomaticSpeechRecognitionPipeline | null = null;
let loadingPromise: Promise<void> | null = null;

export function checkWebGPU(): boolean {
	return 'gpu' in navigator;
}

export function getTranscriberStatus(): TranscriberStatus {
	if (pipelineInstance) return 'ready';
	if (loadingPromise) return 'loading';
	return 'idle';
}

export async function loadModel(
	onProgress?: (progress: TranscriberProgress) => void
): Promise<void> {
	if (pipelineInstance) return;
	if (loadingPromise) return loadingPromise;

	loadingPromise = (async () => {
		onProgress?.({
			status: 'loading',
			progress: 0,
			statusText: 'Downloading model...',
			error: null
		});

		try {
			const transcriber = await pipeline('automatic-speech-recognition', MODEL_ID, {
				dtype: 'q4',
				device: 'webgpu',
				progress_callback: (info: { status: string; progress?: number }) => {
					if (info.status === 'progress' && info.progress !== undefined) {
						const pct = Math.round(info.progress);
						onProgress?.({
							status: 'loading',
							progress: pct,
							statusText: `Loading model... ${pct}%`,
							error: null
						});
					}
				}
			});
			pipelineInstance = transcriber;
			onProgress?.({
				status: 'ready',
				progress: 100,
				statusText: 'Ready',
				error: null
			});
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to load model';
			onProgress?.({
				status: 'error',
				progress: 0,
				statusText: message,
				error: message
			});
			loadingPromise = null;
			throw err;
		}
	})();

	return loadingPromise;
}

export async function transcribe(
	audio: Float32Array,
	language: string,
	onToken?: (token: string) => void
): Promise<string> {
	if (!pipelineInstance) {
		throw new Error('Model not loaded. Call loadModel() first.');
	}

	const streamer = onToken
		? new TextStreamer(pipelineInstance.tokenizer, {
				skip_prompt: true,
				skip_special_tokens: true,
				callback_function: onToken
			})
		: undefined;

	const result = (await pipelineInstance(audio, {
		max_new_tokens: 1024,
		language,
		streamer
	})) as AutomaticSpeechRecognitionOutput;

	return cleanupText(result.text);
}

export async function decodeAudioFile(file: File | Blob): Promise<Float32Array> {
	const arrayBuffer = await file.arrayBuffer();
	const audioCtx = new AudioContext({ sampleRate: AUDIO_SAMPLE_RATE });
	const decoded = await audioCtx.decodeAudioData(arrayBuffer);
	const float32 = decoded.getChannelData(0);
	await audioCtx.close();
	return float32;
}

export function getAudioDuration(audio: Float32Array): number {
	return audio.length / AUDIO_SAMPLE_RATE;
}

export async function dispose(): Promise<void> {
	if (pipelineInstance) {
		await pipelineInstance.dispose();
		pipelineInstance = null;
		loadingPromise = null;
	}
}

/** Rule-based cleanup for ASR output */
function cleanupText(text: string): string {
	let cleaned = text.trim();

	// Capitalize first character
	if (cleaned.length > 0) {
		cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
	}

	// Capitalize after sentence-ending punctuation
	cleaned = cleaned.replace(/([.!?])\s+([a-z])/g, (_, punct, letter) => {
		return `${punct} ${letter.toUpperCase()}`;
	});

	// Capitalize standalone "i"
	cleaned = cleaned.replace(/\bi\b/g, 'I');

	// Remove multiple spaces
	cleaned = cleaned.replace(/ {2,}/g, ' ');

	return cleaned;
}
