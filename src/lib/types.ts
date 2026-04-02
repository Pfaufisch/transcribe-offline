export interface Transcript {
	id: string;
	title: string;
	text: string;
	language: string;
	createdAt: number;
	updatedAt: number;
	audioDuration: number;
	transcriptionTime: number;
	audioFileName: string | null;
}

export interface AudioBlob {
	transcriptId: string;
	blob: Blob;
	createdAt: number;
	mimeType: string;
}

export const LANGUAGES: { code: string; label: string; native: string; flag: string }[] = [
	{ code: 'en', label: 'English', native: 'English', flag: '🇺🇸' },
	{ code: 'fr', label: 'French', native: 'Français', flag: '🇫🇷' },
	{ code: 'de', label: 'German', native: 'Deutsch', flag: '🇩🇪' },
	{ code: 'es', label: 'Spanish', native: 'Español', flag: '🇪🇸' },
	{ code: 'it', label: 'Italian', native: 'Italiano', flag: '🇮🇹' },
	{ code: 'pt', label: 'Portuguese', native: 'Português', flag: '🇵🇹' },
	{ code: 'nl', label: 'Dutch', native: 'Nederlands', flag: '🇳🇱' },
	{ code: 'pl', label: 'Polish', native: 'Polski', flag: '🇵🇱' },
	{ code: 'el', label: 'Greek', native: 'Ελληνικά', flag: '🇬🇷' },
	{ code: 'ar', label: 'Arabic', native: 'العربية', flag: '🇸🇦' },
	{ code: 'ja', label: 'Japanese', native: '日本語', flag: '🇯🇵' },
	{ code: 'zh', label: 'Chinese', native: '中文', flag: '🇨🇳' },
	{ code: 'vi', label: 'Vietnamese', native: 'Tiếng Việt', flag: '🇻🇳' },
	{ code: 'ko', label: 'Korean', native: '한국어', flag: '🇰🇷' }
];

export function getLanguage(code: string) {
	return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}

export function formatDuration(seconds: number): string {
	if (seconds < 60) return `${seconds.toFixed(1)}s`;
	const mins = Math.floor(seconds / 60);
	const secs = Math.round(seconds % 60);
	if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
	const hrs = Math.floor(mins / 60);
	const remainMins = mins % 60;
	return `${hrs}h ${remainMins}m`;
}

export function formatDate(timestamp: number): string {
	return new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		hour: 'numeric',
		minute: '2-digit'
	}).format(new Date(timestamp));
}

export function formatRelativeTime(timestamp: number): string {
	const diff = Date.now() - timestamp;
	const minutes = Math.floor(diff / 60000);
	if (minutes < 1) return 'Just now';
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 7) return `${days}d ago`;
	return formatDate(timestamp);
}
