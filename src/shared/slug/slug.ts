export const PUBLIC_SLUG_MAX_LENGTH = 80;

export type SlugFallback = "restaurant" | "branch";

/** Normaliza un nombre a la representación canónica usada en URLs públicas. */
export function normalizeSlug(value: string, fallback: SlugFallback): string {
	const normalized = value
		.normalize("NFKD")
		.replace(/\p{M}/gu, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");

	return truncateSlug(normalized || fallback);
}

/** Genera un candidato compatible con el límite incluso cuando lleva sufijo. */
export function createSlugCandidate(
	value: string,
	suffix: number,
	fallback: SlugFallback,
): string {
	if (!Number.isInteger(suffix) || suffix < 1) {
		throw new RangeError("El sufijo del slug debe ser un entero positivo");
	}

	const base = normalizeSlug(value, fallback);
	const suffixText = suffix === 1 ? "" : `-${suffix}`;
	if (suffixText.length >= PUBLIC_SLUG_MAX_LENGTH) {
		throw new RangeError("El sufijo del slug supera la longitud máxima");
	}

	const availableBaseLength = PUBLIC_SLUG_MAX_LENGTH - suffixText.length;
	const truncatedBase = base
		.slice(0, Math.max(1, availableBaseLength))
		.replace(/-+$/g, "");

	return `${truncatedBase || fallback}${suffixText}`;
}

/** Itera candidatos hasta que el repositorio encuentre uno disponible. */
export function* generateSlugCandidates(
	value: string,
	fallback: SlugFallback,
): Generator<string> {
	for (let suffix = 1; ; suffix += 1) {
		yield createSlugCandidate(value, suffix, fallback);
	}
}

function truncateSlug(value: string): string {
	return value.slice(0, PUBLIC_SLUG_MAX_LENGTH).replace(/-+$/g, "");
}
