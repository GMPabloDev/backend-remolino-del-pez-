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

export function isSlugUniqueConstraintError(
	error: unknown,
	constraintName: string,
): boolean {
	if (!isRecord(error)) return false;

	if (error.code === "P2002") {
		const target = isRecord(error.meta) ? error.meta.target : undefined;
		if (Array.isArray(target) && target.some((field) => field === "slug")) {
			return true;
		}
	}

	const cause = isRecord(error.cause) ? error.cause : undefined;
	const originalCode = cause?.originalCode;
	const messages = [error.message, cause?.originalMessage, cause?.message];

	return (
		(error.code === "P2002" || originalCode === "23505") &&
		messages.some(
			(message) =>
				typeof message === "string" && message.includes(constraintName),
		)
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
