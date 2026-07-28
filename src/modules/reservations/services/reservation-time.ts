import type { BranchRules } from "../../../generated/prisma/client";

export const RESERVATION_TIMEZONE = "America/Lima";
export const RESERVATION_SLOT_MINUTES = 15;
export const TEMPORARY_RESERVATION_MINUTES = 15;

const MINUTES_PER_DAY = 24 * 60;
const MINUTES_PER_DAY_IN_MS = 24 * 60 * 60 * 1000;
const LIMA_UTC_OFFSET_MINUTES = 5 * 60;

export function roundUpToReservationSlot(minutes: number): number {
	return (
		Math.ceil(minutes / RESERVATION_SLOT_MINUTES) * RESERVATION_SLOT_MINUTES
	);
}

export function getIsoDayOfWeek(date: string): number {
	const [year, month, day] = date.split("-").map(Number);
	const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
	return dayOfWeek === 0 ? 7 : dayOfWeek;
}

export function toReservationInstant(date: string, minutes: number): Date {
	const [year, month, day] = date.split("-").map(Number);
	return new Date(
		Date.UTC(year, month - 1, day) +
			(minutes + LIMA_UTC_OFFSET_MINUTES) * 60 * 1000,
	);
}

export function toReservationInstantFromTime(date: string, time: string): Date {
	const [hour, minute] = time.split(":").map(Number);
	return toReservationInstant(date, hour * 60 + minute);
}

export function isWithinAdvanceWindow(
	startAt: Date,
	now: Date,
	rules: Pick<BranchRules, "minimumAdvanceMinutes" | "maximumAdvanceDays">,
): boolean {
	const minimumStart = now.getTime() + rules.minimumAdvanceMinutes * 60 * 1000;
	const maximumStart =
		now.getTime() + rules.maximumAdvanceDays * MINUTES_PER_DAY_IN_MS;

	return startAt.getTime() >= minimumStart && startAt.getTime() <= maximumStart;
}

export function formatReservationSlot(minutes: number): string {
	if (minutes < 0 || minutes >= MINUTES_PER_DAY) {
		throw new Error("El slot debe pertenecer al día solicitado");
	}

	const hour = Math.floor(minutes / 60);
	const minute = minutes % 60;
	return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function getReservationDurationMinutes(
	startAt: Date,
	endAt: Date,
): number {
	return Math.round((endAt.getTime() - startAt.getTime()) / (60 * 1000));
}
