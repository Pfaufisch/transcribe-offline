import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Transcript, AudioBlob } from './types';

const DB_NAME = 'browser-asr';
const DB_VERSION = 1;
const AUDIO_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

interface BrowserAsrDB extends DBSchema {
	transcripts: {
		key: string;
		value: Transcript;
		indexes: { 'by-created': number };
	};
	audioBlobs: {
		key: string;
		value: AudioBlob;
		indexes: { 'by-created': number };
	};
}

let dbPromise: Promise<IDBPDatabase<BrowserAsrDB>> | null = null;

function getDB() {
	if (!dbPromise) {
		dbPromise = openDB<BrowserAsrDB>(DB_NAME, DB_VERSION, {
			upgrade(db) {
				const transcriptStore = db.createObjectStore('transcripts', { keyPath: 'id' });
				transcriptStore.createIndex('by-created', 'createdAt');

				const audioStore = db.createObjectStore('audioBlobs', { keyPath: 'transcriptId' });
				audioStore.createIndex('by-created', 'createdAt');
			}
		});
	}
	return dbPromise;
}

// --- Transcripts ---

export async function createTranscript(transcript: Transcript): Promise<void> {
	const db = await getDB();
	await db.put('transcripts', transcript);
}

export async function getTranscript(id: string): Promise<Transcript | undefined> {
	const db = await getDB();
	return db.get('transcripts', id);
}

export async function updateTranscript(
	id: string,
	updates: Partial<Omit<Transcript, 'id'>>
): Promise<void> {
	const db = await getDB();
	const existing = await db.get('transcripts', id);
	if (!existing) return;
	await db.put('transcripts', { ...existing, ...updates, updatedAt: Date.now() });
}

export async function deleteTranscript(id: string): Promise<void> {
	const db = await getDB();
	await db.delete('transcripts', id);
	// Also delete associated audio
	await db.delete('audioBlobs', id).catch(() => {});
}

export async function listTranscripts(): Promise<Transcript[]> {
	const db = await getDB();
	const all = await db.getAllFromIndex('transcripts', 'by-created');
	return all.reverse(); // newest first
}

// --- Audio Blobs ---

export async function saveAudioBlob(
	transcriptId: string,
	blob: Blob,
	mimeType: string
): Promise<void> {
	const db = await getDB();
	await db.put('audioBlobs', {
		transcriptId,
		blob,
		createdAt: Date.now(),
		mimeType
	});
}

export async function getAudioBlob(transcriptId: string): Promise<AudioBlob | undefined> {
	const db = await getDB();
	return db.get('audioBlobs', transcriptId);
}

export async function deleteAudioBlob(transcriptId: string): Promise<void> {
	const db = await getDB();
	await db.delete('audioBlobs', transcriptId);
}

// --- Cleanup expired audio (24h) ---

export async function cleanupExpiredAudio(): Promise<number> {
	const db = await getDB();
	const cutoff = Date.now() - AUDIO_EXPIRY_MS;
	const allAudio = await db.getAllFromIndex('audioBlobs', 'by-created');
	let deleted = 0;

	for (const audio of allAudio) {
		if (audio.createdAt < cutoff) {
			await db.delete('audioBlobs', audio.transcriptId);
			deleted++;
		}
	}

	return deleted;
}
