import { z } from "zod";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const getAvailabilitySchema = z
	.object({
		date: z
			.string()
			.regex(DATE_REGEX, "La fecha debe tener el formato YYYY-MM-DD")
			.refine(isValidCalendarDate, "La fecha no es válida"),
		partySize: z.coerce.number().int().positive(),
	})
	.strict();

export type GetAvailabilityQuery = z.infer<typeof getAvailabilitySchema>;

export function isValidCalendarDate(value: string): boolean {
	const [year, month, day] = value.split("-").map(Number);
	const date = new Date(Date.UTC(year, month - 1, day));

	return (
		date.getUTCFullYear() === year &&
		date.getUTCMonth() === month - 1 &&
		date.getUTCDate() === day
	);
}
