import type { AvailabilityDto } from "../../dto/reservation.dto";
import { PublicReservationNotFoundException } from "../../exceptions/public-reservation-not-found.exception";
import { ReservationTimeUnavailableException } from "../../exceptions/reservation-time-unavailable.exception";
import { toAvailabilityDto } from "../../mapper/reservation.mapper";
import type { ReservationRepository } from "../../repositories/reservation.repository";
import type { GetAvailabilityQuery } from "../../schemas/get-availability.schema";
import {
	formatReservationSlot,
	getIsoDayOfWeek,
	isWithinAdvanceWindow,
	RESERVATION_SLOT_MINUTES,
	RESERVATION_TIMEZONE,
	roundUpToReservationSlot,
	toReservationInstant,
} from "../../services/reservation-time";
import type { GetAvailabilityUseCase } from "./get-availability.use-case";

export class GetAvailabilityUseCaseImpl implements GetAvailabilityUseCase {
	constructor(
		private readonly reservationRepository: ReservationRepository,
		private readonly now: () => Date = () => new Date(),
	) {}

	async execute(
		restaurantSlug: string,
		branchSlug: string,
		input: GetAvailabilityQuery,
	): Promise<AvailabilityDto> {
		const branch = await this.reservationRepository.findBranchContext(
			restaurantSlug,
			branchSlug,
		);

		if (branch?.status !== "ACTIVE" || !branch.rules) {
			throw new PublicReservationNotFoundException();
		}

		if (input.partySize > branch.rules.maxPartySize) {
			throw new ReservationTimeUnavailableException();
		}

		const now = this.now();
		const dayOfWeek = getIsoDayOfWeek(input.date);
		const intervals = branch.intervals.filter(
			(interval) => interval.dayOfWeek === dayOfWeek,
		);
		const availableTimes = new Set<string>();

		for (const interval of intervals) {
			const firstSlot = roundUpToReservationSlot(interval.startMinute);
			const lastSlot =
				interval.endMinute - branch.rules.defaultReservationDurationMinutes;

			for (
				let slotMinute = firstSlot;
				slotMinute <= lastSlot;
				slotMinute += RESERVATION_SLOT_MINUTES
			) {
				const startAt = toReservationInstant(input.date, slotMinute);
				if (!isWithinAdvanceWindow(startAt, now, branch.rules)) continue;

				const endAt = new Date(
					startAt.getTime() +
						branch.rules.defaultReservationDurationMinutes * 60 * 1000,
				);
				const tables = await this.reservationRepository.findAvailableTables(
					branch.id,
					input.partySize,
					startAt,
					endAt,
					now,
				);

				if (tables.length > 0) {
					availableTimes.add(formatReservationSlot(slotMinute));
				}
			}
		}

		return toAvailabilityDto(
			input.date,
			RESERVATION_TIMEZONE,
			branch.rules.defaultReservationDurationMinutes,
			Array.from(availableTimes).sort(),
		);
	}
}
