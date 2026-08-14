export type TemporaryReservationStatus = "pending_payment" | "confirmed";

export interface ReservationCustomerDto {
	fullName: string;
	email: string;
	phone: string;
}

export type ReservationBillingDocumentDto =
	| { type: "BOLETA"; documentNumber: string | null }
	| {
			type: "FACTURA";
			ruc: string | null;
			businessName: string | null;
			fiscalAddress: string | null;
	  };

export interface ReservationItemDto {
	dishId: string;
	name: string;
	unitPrice: string;
	quantity: number;
	subtotal: string;
}

export interface AvailabilityDto {
	date: string;
	timezone: string;
	durationMinutes: number;
	availableTimes: string[];
}

export interface TemporaryReservationDto {
	id: string;
	branchSlug: string;
	status: TemporaryReservationStatus;
	date: string;
	startTime: string;
	endTime: string;
	timezone: string;
	durationMinutes: number;
	expiresAt: string;
	partySize: number;
	customer: ReservationCustomerDto;
	billingDocument: ReservationBillingDocumentDto;
	items: ReservationItemDto[];
	currency: string;
	total: string;
	checkoutToken: string | null;
	createdAt: string;
}
