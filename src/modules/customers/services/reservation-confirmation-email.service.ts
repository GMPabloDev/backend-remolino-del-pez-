import type { EmailMessage } from "../../../shared/email/email.service";

export interface ReservationConfirmationEmailItem {
	name: string;
	quantity: number;
	unitPrice: string;
	subtotal: string;
}

export interface ReservationConfirmationEmailData {
	to: string;
	customerName: string;
	restaurantName: string;
	branchName: string;
	startAt: Date;
	endAt: Date;
	timezone: string;
	partySize: number;
	items: ReservationConfirmationEmailItem[];
	currency: string;
	total: string;
	accessUrl: string;
}

export interface ReservationConfirmationEmailService {
	create(data: ReservationConfirmationEmailData): EmailMessage;
}
