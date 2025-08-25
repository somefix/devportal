import normalizeUrlPackage from 'normalize-url';

export const normalizePath = (path: string): string => {
	// Удаляем лишние "/" из pathname
	path = path.replace(/\/{2,}/g, '/');

	return path;
};

export const normalizeUrl = (url: string): string => {
	let normalizedUrl = normalizeUrlPackage(url, { defaultProtocol: 'https', normalizeProtocol: true, forceHttps: true });

	if (!normalizedUrl.startsWith('https://')) {
		normalizedUrl = `https://${normalizedUrl}`
	}

	return normalizedUrl;
};