import { createHash } from "node:crypto";
import { Prisma } from "../../../../generated/prisma/client";
import { DishNotAvailableException } from "../../exceptions/dish-not-available.exception";
import { IdempotencyKeyReusedException } from "../../exceptions/idempotency-key-reused.exception";
import { PublicReservationNotFoundException } from "../../exceptions/public-reservation-not-found.exception";
import { ReservationTimeUnavailableException } from "../../exceptions/reservation-time-unavailable.exception";
import { toTemporaryReservationDto } from "../../mapper/reservation.mapper";
import type {
	CreateReservationItemData,
	ReservationRepository,
	ReservationWithItems,
} from "../../repositories/reservation.repository";
import type { CreateTemporaryReservationInput } from "../../schemas/create-temporary-reservation.schema";
import {
	getIsoDayOfWeek,
	getReservationDurationMinutes,
	isWithinAdvanceWindow,
	RESERVATION_TIMEZONE,
	TEMPORARY_RESERVATION_MINUTES,
	toReservationInstantFromTime,
} from "../../services/reservation-time";
import type {
	CreateTemporaryReservationResult,
	CreateTemporaryReservationUseCase,
} from "./create-temporary-reservation.use-case";

export class CreateTemporaryReservationUseCaseImpl
	implements CreateTemporaryReservationUseCase
{
	constructor(
		private readonly reservationRepository: ReservationRepository,
		private readonly now: () => Date = () => new Date(),
	) {}

	async execute(
		restaurantId: string,
		branchId: string,
		idempotencyKey: string,
		input: CreateTemporaryReservationInput,
	): Promise<CreateTemporaryReservationResult> {
		const normalizedInput = normalizeInput(input);
		const requestHash = createRequestHash(
			restaurantId,
			branchId,
			normalizedInput,
		);
		const existing =
			await this.reservationRepository.findByIdempotencyKey(idempotencyKey);

		if (existing) {
			return this.buildReplay(existing, requestHash);
		}

		const branch = await this.reservationRepository.findBranchContext(
			restaurantId,
			branchId,
		);

		const rules = branch?.rules;
		if (branch?.status !== "ACTIVE" || !rules) {
			throw new PublicReservationNotFoundException();
		}

		if (normalizedInput.partySize > rules.maxPartySize) {
			throw new ReservationTimeUnavailableException();
		}

		const now = this.now();
		const startAt = toReservationInstantFromTime(
			normalizedInput.date,
			normalizedInput.time,
		);
		if (!isWithinAdvanceWindow(startAt, now, rules)) {
			throw new ReservationTimeUnavailableException();
		}

		const endAt = new Date(
			startAt.getTime() + rules.defaultReservationDurationMinutes * 60 * 1000,
		);
		const dayOfWeek = getIsoDayOfWeek(normalizedInput.date);
		const startMinute = getMinutesFromTime(normalizedInput.time);
		const fitsSchedule = branch.intervals.some(
			(interval) =>
				interval.dayOfWeek === dayOfWeek &&
				startMinute >= interval.startMinute &&
				startMinute + rules.defaultReservationDurationMinutes <=
					interval.endMinute,
		);

		if (!fitsSchedule) {
			throw new ReservationTimeUnavailableException();
		}

		const dishIds = normalizedInput.items.map((item) => item.dishId);
		const reservableDishes =
			await this.reservationRepository.findReservableDishes(
				restaurantId,
				branchId,
				dishIds,
			);
		const dishById = new Map(
			reservableDishes.map((dish) => [dish.dishId, dish]),
		);
		const unavailableDishIds = dishIds.filter(
			(dishId) => !dishById.has(dishId),
		);

		if (unavailableDishIds.length > 0) {
			throw new DishNotAvailableException(unavailableDishIds);
		}

		const items: CreateReservationItemData[] = normalizedInput.items.map(
			(item) => {
				const dish = dishById.get(item.dishId);
				if (!dish) throw new DishNotAvailableException([item.dishId]);

				const subtotal = dish.unitPrice.mul(item.quantity);
				return {
					dishId: dish.dishId,
					dishName: dish.name,
					unitPrice: dish.unitPrice,
					quantity: item.quantity,
					subtotal,
				};
			},
		);
		const total = items.reduce(
			(sum, item) => sum.add(item.subtotal),
			new Prisma.Decimal(0),
		);
		const expiresAt = new Date(
			now.getTime() + TEMPORARY_RESERVATION_MINUTES * 60 * 1000,
		);
		const result = await this.reservationRepository.createTemporary(
			{
				branchId,
				idempotencyKey,
				requestHash,
				fullName: normalizedInput.customer.fullName,
				email: normalizedInput.customer.email,
				phone: normalizedInput.customer.phone,
				partySize: normalizedInput.partySize,
				startAt,
				endAt,
				expiresAt,
				currency: "PEN",
				total,
				items,
			},
			now,
		);

		if (!result) {
			throw new ReservationTimeUnavailableException();
		}

		if (!result.created && result.reservation.requestHash !== requestHash) {
			throw new IdempotencyKeyReusedException();
		}

		const durationMinutes = result.created
			? rules.defaultReservationDurationMinutes
			: getReservationDurationMinutes(
					result.reservation.startAt,
					result.reservation.endAt,
				);

		return {
			reservation: toTemporaryReservationDto(
				result.reservation,
				RESERVATION_TIMEZONE,
				durationMinutes,
			),
			created: result.created,
		};
	}

	private buildReplay(
		reservation: ReservationWithItems,
		requestHash: string,
	): CreateTemporaryReservationResult {
		if (reservation.requestHash !== requestHash) {
			throw new IdempotencyKeyReusedException();
		}

		return {
			reservation: toTemporaryReservationDto(
				reservation,
				RESERVATION_TIMEZONE,
				getReservationDurationMinutes(reservation.startAt, reservation.endAt),
			),
			created: false,
		};
	}
}

function normalizeInput(
	input: CreateTemporaryReservationInput,
): CreateTemporaryReservationInput {
	return {
		...input,
		customer: {
			fullName: input.customer.fullName.trim(),
			email: input.customer.email.trim().toLowerCase(),
			phone: input.customer.phone.trim(),
		},
	};
}

function createRequestHash(
	restaurantId: string,
	branchId: string,
	input: CreateTemporaryReservationInput,
): string {
	const normalizedItems = [...input.items].sort((a, b) =>
		a.dishId.localeCompare(b.dishId),
	);
	const canonicalPayload = JSON.stringify({
		restaurantId,
		branchId,
		date: input.date,
		time: input.time,
		partySize: input.partySize,
		customer: input.customer,
		items: normalizedItems,
	});

	return createHash("sha256").update(canonicalPayload).digest("hex");
}

function getMinutesFromTime(time: string): number {
	const [hour, minute] = time.split(":").map(Number);
	return hour * 60 + minute;
}
