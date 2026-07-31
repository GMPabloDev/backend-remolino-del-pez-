export type SlugConflictScope = "restaurant" | "branch";

/** Error interno para que los casos de uso reintenten únicamente conflictos de slug. */
export class SlugConflictError extends Error {
	constructor(
		readonly scope: SlugConflictScope,
		readonly slug: string,
	) {
		super(`El slug ${slug} ya está ocupado para ${scope}`);
		this.name = "SlugConflictError";
	}
}
