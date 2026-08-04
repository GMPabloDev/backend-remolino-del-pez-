import type { ReservationStatus } from "../../../generated/prisma/client";

const CONFIRMED_CHECKOUT_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export function isConfirmedCheckoutTokenExpired(
	status: ReservationStatus,
	confirmedAt: Date | null,
	now: Date,
): boolean {
	return (
		status === "CONFIRMED" &&
		confirmedAt !== null &&
		now.getTime() >= confirmedAt.getTime() + CONFIRMED_CHECKOUT_TOKEN_TTL_MS
	);
}
