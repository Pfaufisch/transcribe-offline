# Browser ASR

A fully local, browser-based audio transcription app. All processing happens on-device — no audio leaves your computer.

Powered by [Cohere Transcribe](https://huggingface.co/CohereLabs/cohere-transcribe-03-2026) (2B parameter ASR model) running via [Transformers.js](https://huggingface.co/docs/transformers.js) and WebGPU.

## Features

- **100% local** — transcription runs entirely in your browser via WebGPU
- **14 languages** — English, French, German, Spanish, Italian, Portuguese, Dutch, Polish, Greek, Arabic, Japanese, Chinese, Vietnamese, Korean
- **Real-time streaming** — see tokens appear as the model generates them
- **File upload** — drag & drop or pick any audio/video file
- **Microphone recording** — record and transcribe directly
- **Persistent transcripts** — saved to IndexedDB, survives browser restarts
- **Editable transcripts** — fix typos with auto-save
- **Audio playback** — listen alongside the transcript (audio kept for 24 hours)
- **Copy & download** — export transcripts as text

## Requirements

- A WebGPU-capable browser (Chrome 113+ or Edge 113+)
- ~1 GB of storage for the model (cached after first download)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in Chrome or Edge.

On first use, the model will be downloaded and cached in the browser (~1 GB, q4 quantized). Subsequent loads are near-instant.

## Tech Stack

- **Svelte 5** (runes) + **SvelteKit** + **TypeScript**
- **Tailwind CSS 4**
- **@huggingface/transformers** — runs the ONNX model via WebGPU
- **idb** — IndexedDB wrapper for persistent storage
- Model: [`onnx-community/cohere-transcribe-03-2026-ONNX`](https://huggingface.co/onnx-community/cohere-transcribe-03-2026-ONNX)

## Building

```bash
npm run build
npm run preview
```

Produces a static site in `build/` that can be deployed anywhere.
