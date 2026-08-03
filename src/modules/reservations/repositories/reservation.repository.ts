import type {
	Branch,
	BranchRules,
	BranchScheduleInterval,
	DiningTable,
	Prisma,
	Reservation,
	ReservationItem,
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
}
