export interface CustomerReservationItemDto {
	dishId: string;
	name: string;
	unitPrice: string;
	quantity: number;
	subtotal: string;
}

export interface CustomerReservationReceiptDto {
	type: "BOLETA" | "FACTURA";
	number: string;
	status: "pending" | "available" | "failed";
	generatedAt: string | null;
}

export interface CustomerReservationDto {
	id: string;
	status: "confirmed";
	branch: {
		slug: string;
		name: string;
		address: string;
		district: string;
		province: string;
		department: string;
	};
	startAt: string;
	endAt: string;
	timezone: string;
	partySize: number;
	items: CustomerReservationItemDto[];
	currency: string;
	total: string;
	confirmedAt: string;
	receipt: CustomerReservationReceiptDto | null;
}
