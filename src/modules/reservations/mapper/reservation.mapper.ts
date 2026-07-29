import type { ReservationStatus } from "../../../generated/prisma/client";
import type {
	AvailabilityDto,
	TemporaryReservationDto,
	TemporaryReservationStatus,
} from "../dto/reservation.dto";
import type { ReservationWithItems } from "../repositories/reservation.repository";

export function toAvailabilityDto(
	date: string,
	timezone: string,
	durationMinutes: number,
	availableTimes: string[],
): AvailabilityDto {
	return { date, timezone, durationMinutes, availableTimes };
}

export function toTemporaryReservationDto(
	reservation: ReservationWithItems,
	timezone: string,
	durationMinutes: number,
	checkoutToken: string | null = null,
): TemporaryReservationDto {
	const start = formatDateTime(reservation.startAt, timezone);
	const end = formatDateTime(reservation.endAt, timezone);

	return {
		id: reservation.id,
		branchId: reservation.branchId,
		status: toReservationStatus(reservation.status),
		date: start.date,
		startTime: start.time,
		endTime: end.time,
		timezone,
		durationMinutes,
		expiresAt: reservation.expiresAt.toISOString(),
		partySize: reservation.partySize,
		customer: {
			fullName: reservation.fullName,
			email: reservation.email,
			phone: reservation.phone,
		},
		items: reservation.items.map((item) => ({
			dishId: item.dishId,
			name: item.dishName,
			unitPrice: item.unitPrice.toFixed(2),
			quantity: item.quantity,
			subtotal: item.subtotal.toFixed(2),
		})),
		currency: reservation.currency,
		total: reservation.total.toFixed(2),
		checkoutToken,
		createdAt: reservation.createdAt.toISOString(),
	};
}

function toReservationStatus(
	status: ReservationStatus,
): TemporaryReservationStatus {
	return status === "PENDING_PAYMENT" ? "pending_payment" : "confirmed";
}

function formatDateTime(
	value: Date,
	timezone: string,
): { date: string; time: string } {
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone: timezone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
	})
		.formatToParts(value)
		.reduce<Record<string, string>>((result, part) => {
			if (part.type !== "literal") result[part.type] = part.value;
			return result;
		}, {});

	return {
		date: `${parts.year}-${parts.month}-${parts.day}`,
		time: `${parts.hour}:${parts.minute}`,
	};
}
