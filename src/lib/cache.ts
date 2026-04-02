const CACHE_NAME = 'transformers-cache';

export interface CachedModelInfo {
	name: string;
	files: CachedFileInfo[];
	totalSize: number;
}

export interface CachedFileInfo {
	url: string;
	fileName: string;
	size: number;
}

/** Inspect the transformers.js browser cache and group files by model */
export async function listCachedModels(): Promise<CachedModelInfo[]> {
	if (!('caches' in window)) return [];

	try {
		const cache = await caches.open(CACHE_NAME);
		const keys = await cache.keys();
		const modelMap = new Map<string, CachedFileInfo[]>();

		for (const request of keys) {
			const url = request.url;
			// HuggingFace URLs: https://huggingface.co/{org}/{model}/resolve/{rev}/{file}
			const match = url.match(/huggingface\.co\/([^/]+\/[^/]+)\/resolve\//);
			const modelName = match ? match[1] : 'Unbekannt';
			const fileName = url.split('/').pop() ?? url;

			let size = 0;
			try {
				const response = await cache.match(request);
				if (response) {
					const contentLength = response.headers.get('content-length');
					if (contentLength) {
						size = parseInt(contentLength, 10);
					} else {
						// Fall back to reading the blob size
						const blob = await response.clone().blob();
						size = blob.size;
					}
				}
			} catch {
				// ignore errors for individual files
			}

			const files = modelMap.get(modelName) ?? [];
			files.push({ url, fileName, size });
			modelMap.set(modelName, files);
		}

		return Array.from(modelMap.entries()).map(([name, files]) => ({
			name,
			files,
			totalSize: files.reduce((sum, f) => sum + f.size, 0)
		}));
	} catch {
		return [];
	}
}

/** Delete all cached files for a specific model */
export async function deleteCachedModel(modelName: string): Promise<void> {
	if (!('caches' in window)) return;

	const cache = await caches.open(CACHE_NAME);
	const keys = await cache.keys();

	for (const request of keys) {
		const match = request.url.match(/huggingface\.co\/([^/]+\/[^/]+)\/resolve\//);
		const name = match ? match[1] : 'Unbekannt';
		if (name === modelName) {
			await cache.delete(request);
		}
	}
}
