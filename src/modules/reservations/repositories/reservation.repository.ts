import type {
	Branch,
	BranchRules,
	BranchScheduleInterval,
	DiningTable,
	PaymentReceiptStatus,
	Prisma,
	Reservation,
	ReservationItem,
	ReservationStatus,
} from "../../../generated/prisma/client";

export type ReservationBranchContext = Branch & {
	rules: BranchRules;
	intervals: BranchScheduleInterval[];
};

export type ReservationWithItems = Reservation & {
	items: ReservationItem[];
};

export interface ReservableDish {
	dishId: string;
	name: string;
	unitPrice: Prisma.Decimal;
}

export interface CreateTemporaryReservationData {
	branchId: string;
	idempotencyKey: string;
	requestHash: string;
	checkoutTokenVersion: string;
	fullName: string;
	email: string;
	phone: string;
	partySize: number;
	startAt: Date;
	endAt: Date;
	expiresAt: Date;
	currency: string;
	total: Prisma.Decimal;
	items: CreateReservationItemData[];
}

export interface CreateReservationItemData {
	dishId: string;
	dishName: string;
	unitPrice: Prisma.Decimal;
	quantity: number;
	subtotal: Prisma.Decimal;
}

export interface ReservationWriteResult {
	reservation: ReservationWithItems;
	created: boolean;
}

export interface CustomerReservationRecord {
	id: string;
	status: ReservationStatus;
	startAt: Date;
	endAt: Date;
	partySize: number;
	currency: string;
	total: Prisma.Decimal;
	confirmedAt: Date | null;
	createdAt: Date;
	branch: {
		slug: string;
		name: string;
		address: string;
		district: string;
		province: string;
		department: string;
		restaurant: { timezone: string };
	};
	items: ReservationItem[];
	paymentReceipt: {
		sequence: number;
		status: PaymentReceiptStatus;
		generatedAt: Date | null;
	} | null;
}

export interface ReservationRepository {
	findBranchContext(
		restaurantSlug: string,
		branchSlug: string,
	): Promise<ReservationBranchContext | null>;
	findByIdempotencyKey(
		idempotencyKey: string,
	): Promise<ReservationWithItems | null>;
	findReservableDishes(
		restaurantId: string,
		branchId: string,
		dishIds: string[],
	): Promise<ReservableDish[]>;
	findAvailableTables(
		branchId: string,
		partySize: number,
		startAt: Date,
		endAt: Date,
		now: Date,
	): Promise<DiningTable[]>;
	createTemporary(
		data: CreateTemporaryReservationData,
		now: Date,
	): Promise<ReservationWriteResult | null>;
	setCheckoutTokenHash(reservationId: string, hash: string): Promise<void>;
	findConfirmedByCustomerId(
		customerId: string,
	): Promise<CustomerReservationRecord[]>;
}
