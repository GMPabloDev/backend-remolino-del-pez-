/**
 * Normaliza una lista de textos:
 * - Recorta cada elemento.
 * - Elimina entradas vacías tras el recorte.
 * - Deduplica sin distinguir mayúsculas/minúsculas, conservando la primera escritura.
 */
export function normalizeTextList(items: string[]): string[] {
	const seen = new Map<string, string>();

	for (const raw of items) {
		const trimmed = raw.trim();
		if (trimmed.length === 0) continue;

		const key = trimmed.toLowerCase();
		if (!seen.has(key)) {
			seen.set(key, trimmed);
		}
	}

	return Array.from(seen.values());
}
