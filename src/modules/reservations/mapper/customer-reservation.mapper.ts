import type { CustomerReservationDto } from "../dto/customer-reservation.dto";
import type { CustomerReservationRecord } from "../repositories/reservation.repository";

export function toCustomerReservationDto(
	reservation: CustomerReservationRecord,
): CustomerReservationDto {
	return {
		id: reservation.id,
		status: "confirmed",
		branch: {
			slug: reservation.branch.slug,
			name: reservation.branch.name,
			address: reservation.branch.address,
			district: reservation.branch.district,
			province: reservation.branch.province,
			department: reservation.branch.department,
		},
		startAt: reservation.startAt.toISOString(),
		endAt: reservation.endAt.toISOString(),
		timezone: reservation.branch.restaurant.timezone,
		partySize: reservation.partySize,
		items: reservation.items.map((item) => ({
			dishId: item.dishId,
			name: item.dishName,
			unitPrice: item.unitPrice.toFixed(2),
			quantity: item.quantity,
			subtotal: item.subtotal.toFixed(2),
		})),
		currency: reservation.currency,
		total: reservation.total.toFixed(2),
		confirmedAt: (
			reservation.confirmedAt ?? reservation.createdAt
		).toISOString(),
		receipt: reservation.paymentReceipt
			? {
					number: formatReceiptNumber(reservation.paymentReceipt.sequence),
					status: reservation.paymentReceipt.status.toLowerCase() as
						| "pending"
						| "available"
						| "failed",
					generatedAt:
						reservation.paymentReceipt.generatedAt?.toISOString() ?? null,
				}
			: null,
	};
}

function formatReceiptNumber(sequence: number): string {
	return `CP-${String(sequence).padStart(6, "0")}`;
}
