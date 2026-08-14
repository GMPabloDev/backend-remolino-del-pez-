import type {
	PaymentReceipt,
	PaymentReceiptStatus,
	ReservationItem,
} from "../../../generated/prisma/client";

export interface PaymentReceiptPdfContext {
	receipt: PaymentReceipt;
	reservation: {
		startAt: Date;
		endAt: Date;
		partySize: number;
		items: ReservationItem[];
		branch: {
			restaurant: {
				timezone: string;
			};
		};
	};
}

export interface PaymentReceiptRepository {
	findById(id: string): Promise<PaymentReceiptPdfContext | null>;
	findByCustomerAndReservation(
		customerId: string,
		reservationId: string,
	): Promise<PaymentReceipt | null>;
	markAvailable(
		id: string,
		data: {
			storagePublicId: string;
			storageVersion: string;
			storageBytes: number;
			generatedAt: Date;
		},
	): Promise<PaymentReceipt>;
	markFailed(
		id: string,
		failedAt: Date,
		errorCode: string,
	): Promise<PaymentReceipt>;
}

export type ReceiptState = PaymentReceiptStatus;
