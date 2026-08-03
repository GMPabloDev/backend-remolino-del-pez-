import {
	type Branch,
	type BranchRules,
	type BranchScheduleInterval,
	type DiningTable,
	Prisma,
	ReservationStatus,
} from "../../../generated/prisma/client";
import { prisma } from "../../../shared/database/prisma-client";
import { isValidUuid } from "../../../shared/guards/uuid.guard";
import type {
	CreateTemporaryReservationData,
	ReservableDish,
	ReservationBranchContext,
	ReservationRepository,
	ReservationWithItems,
	ReservationWriteResult,
} from "./reservation.repository";

const RESERVATION_INCLUDE = { items: true } as const;
const SERIALIZABLE_RETRY_LIMIT = 3;

type PrismaBranchContext = Branch & {
	rules: BranchRules | null;
	intervals: BranchScheduleInterval[];
};

/**
 * La API garantiza que toda sucursal tiene reglas (obligatorias al crear y no
 * nullables por update), así que el tipo de dominio es no-nullable.
 */
function toBranchContext(
	branch: PrismaBranchContext,
): ReservationBranchContext {
	return branch as ReservationBranchContext;
}

export class PrismaReservationRepository implements ReservationRepository {
	async findBranchContext(
		restaurantSlug: string,
		branchSlug: string,
	): Promise<ReservationBranchContext | null> {
		if (!restaurantSlug || !branchSlug) return null;

		const branch = await prisma.branch.findFirst({
			where: { slug: branchSlug, restaurant: { slug: restaurantSlug } },
			include: {
				rules: true,
				intervals: {
					orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }],
				},
			},
		});
		return branch ? toBranchContext(branch) : null;
	}

	async findByIdempotencyKey(
		idempotencyKey: string,
	): Promise<ReservationWithItems | null> {
		if (!isValidUuid(idempotencyKey)) return null;

		return prisma.reservation.findUnique({
			where: { idempotencyKey },
			include: RESERVATION_INCLUDE,
		});
	}

	async findReservableDishes(
		restaurantId: string,
		branchId: string,
		dishIds: string[],
	): Promise<ReservableDish[]> {
		if (
			!isValidUuid(restaurantId) ||
			!isValidUuid(branchId) ||
			dishIds.length === 0
		) {
			return [];
		}

		const branchDishes = await prisma.branchDish.findMany({
			where: {
				branchId,
				dishId: { in: dishIds },
				status: "AVAILABLE",
				branch: { restaurantId },
				dish: {
					restaurantId,
					status: "ACTIVE",
					category: { restaurantId, status: "ACTIVE" },
				},
			},
			select: {
				dishId: true,
				price: true,
				dish: { select: { name: true } },
			},
		});

		return branchDishes.map((branchDish) => ({
			dishId: branchDish.dishId,
			name: branchDish.dish.name,
			unitPrice: branchDish.price,
		}));
	}

	async findAvailableTables(
		branchId: string,
		partySize: number,
		startAt: Date,
		endAt: Date,
		now: Date,
	): Promise<DiningTable[]> {
		if (!isValidUuid(branchId)) return [];

		return prisma.diningTable.findMany({
			where: buildAvailableTableWhere(branchId, partySize, startAt, endAt, now),
			orderBy: [{ capacity: "asc" }, { code: "asc" }, { id: "asc" }],
		});
	}

	async createTemporary(
		data: CreateTemporaryReservationData,
		now: Date,
	): Promise<ReservationWriteResult | null> {
		for (let attempt = 1; attempt <= SERIALIZABLE_RETRY_LIMIT; attempt += 1) {
			try {
				return await prisma.$transaction(
					async (tx) => {
						const existing = await tx.reservation.findUnique({
							where: { idempotencyKey: data.idempotencyKey },
							include: RESERVATION_INCLUDE,
						});

						if (existing) {
							return { reservation: existing, created: false };
						}

						const table = await tx.diningTable.findFirst({
							where: buildAvailableTableWhere(
								data.branchId,
								data.partySize,
								data.startAt,
								data.endAt,
								now,
							),
							orderBy: [{ capacity: "asc" }, { code: "asc" }, { id: "asc" }],
						});

						if (!table) return null;

						const reservation = await tx.reservation.create({
							data: {
								branchId: data.branchId,
								tableId: table.id,
								idempotencyKey: data.idempotencyKey,
								requestHash: data.requestHash,
								checkoutTokenVersion: data.checkoutTokenVersion,
								fullName: data.fullName,
								email: data.email,
								phone: data.phone,
								partySize: data.partySize,
								startAt: data.startAt,
								endAt: data.endAt,
								expiresAt: data.expiresAt,
								currency: data.currency,
								total: data.total,
								status: ReservationStatus.PENDING_PAYMENT,
								items: { create: data.items },
							},
							include: RESERVATION_INCLUDE,
						});

						return { reservation, created: true };
					},
					{
						isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
						maxWait: 5_000,
						timeout: 10_000,
					},
				);
			} catch (error) {
				if (isUniqueConstraintError(error)) {
					const existing = await this.findByIdempotencyKey(data.idempotencyKey);
					if (existing) return { reservation: existing, created: false };
				}

				if (!isSerializationConflict(error)) throw error;
				if (attempt === SERIALIZABLE_RETRY_LIMIT) throw error;
			}
		}

		throw new Error("No se pudo completar la transacción de reserva");
	}

	async setCheckoutTokenHash(
		reservationId: string,
		hash: string,
	): Promise<void> {
		await prisma.reservation.update({
			where: { id: reservationId },
			data: { checkoutTokenHash: hash },
		});
	}
}

function buildAvailableTableWhere(
	branchId: string,
	partySize: number,
	startAt: Date,
	endAt: Date,
	now: Date,
): Prisma.DiningTableWhereInput {
	return {
		branchId,
		status: "ACTIVE",
		capacity: { gte: partySize },
		reservations: {
			none: buildReservationOverlapWhere(startAt, endAt, now),
		},
	};
}

function buildReservationOverlapWhere(
	startAt: Date,
	endAt: Date,
	now: Date,
): Prisma.ReservationWhereInput {
	return {
		OR: [
			{
				status: ReservationStatus.CONFIRMED,
				startAt: { lt: endAt },
				endAt: { gt: startAt },
			},
			{
				status: ReservationStatus.PENDING_PAYMENT,
				expiresAt: { gt: now },
				startAt: { lt: endAt },
				endAt: { gt: startAt },
			},
		],
	};
}

function isUniqueConstraintError(error: unknown): boolean {
	return hasPrismaCode(error, "P2002") || hasAdapterCode(error, "23505");
}

function isSerializationConflict(error: unknown): boolean {
	return hasPrismaCode(error, "P2034") || hasAdapterCode(error, "40001");
}

function hasPrismaCode(error: unknown, code: string): boolean {
	return (
		error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
	);
}

function hasAdapterCode(error: unknown, code: string): boolean {
	if (!isRecord(error) || !isRecord(error.cause)) return false;
	return error.cause.originalCode === code;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
