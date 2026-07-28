import type { AvailabilityDto } from "../../dto/reservation.dto";
import { PublicReservationNotFoundException } from "../../exceptions/public-reservation-not-found.exception";
import { ReservationTimeUnavailableException } from "../../exceptions/reservation-time-unavailable.exception";
import { toAvailabilityDto } from "../../mapper/reservation.mapper";
import type { ReservationRepository } from "../../repositories/reservation.repository";
import type { GetAvailabilityQuery } from "../../schemas/get-availability.schema";
import type { GetAvailabilityUseCase } from "./get-availability.use-case";

const RESTAURANT_TIMEZONE = "America/Lima";
const SLOT_MINUTES = 15;
const MINUTES_PER_DAY = 24 * 60;
const MINUTES_PER_DAY_IN_MS = 24 * 60 * 60 * 1000;
const LIMA_UTC_OFFSET_MINUTES = 5 * 60;

export class GetAvailabilityUseCaseImpl implements GetAvailabilityUseCase {
	constructor(
		private readonly reservationRepository: ReservationRepository,
		private readonly now: () => Date = () => new Date(),
	) {}

	async execute(
		restaurantId: string,
		branchId: string,
		input: GetAvailabilityQuery,
	): Promise<AvailabilityDto> {
		const branch = await this.reservationRepository.findBranchContext(
			restaurantId,
			branchId,
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
			const firstSlot = roundUpToSlot(interval.startMinute);
			const lastSlot =
				interval.endMinute - branch.rules.defaultReservationDurationMinutes;

			for (
				let slotMinute = firstSlot;
				slotMinute <= lastSlot;
				slotMinute += SLOT_MINUTES
			) {
				if (slotMinute >= MINUTES_PER_DAY) continue;

				const startAt = toInstant(input.date, slotMinute);
				if (!isWithinAdvanceWindow(startAt, now, branch.rules)) continue;

				const endAt = new Date(
					startAt.getTime() +
						branch.rules.defaultReservationDurationMinutes * 60 * 1000,
				);
				const tables = await this.reservationRepository.findAvailableTables(
					branchId,
					input.partySize,
					startAt,
					endAt,
					now,
				);

				if (tables.length > 0) {
					availableTimes.add(formatSlot(slotMinute));
				}
			}
		}

		return toAvailabilityDto(
			input.date,
			RESTAURANT_TIMEZONE,
			branch.rules.defaultReservationDurationMinutes,
			Array.from(availableTimes).sort(),
		);
	}
}

function roundUpToSlot(minutes: number): number {
	return Math.ceil(minutes / SLOT_MINUTES) * SLOT_MINUTES;
}

function getIsoDayOfWeek(date: string): number {
	const [year, month, day] = date.split("-").map(Number);
	const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
	return dayOfWeek === 0 ? 7 : dayOfWeek;
}

function toInstant(date: string, minutes: number): Date {
	const [year, month, day] = date.split("-").map(Number);
	return new Date(
		Date.UTC(year, month - 1, day) +
			(minutes + LIMA_UTC_OFFSET_MINUTES) * 60 * 1000,
	);
}

function isWithinAdvanceWindow(
	startAt: Date,
	now: Date,
	rules: {
		minimumAdvanceMinutes: number;
		maximumAdvanceDays: number;
	},
): boolean {
	const minimumStart = now.getTime() + rules.minimumAdvanceMinutes * 60 * 1000;
	const maximumStart =
		now.getTime() + rules.maximumAdvanceDays * MINUTES_PER_DAY_IN_MS;

	return startAt.getTime() >= minimumStart && startAt.getTime() <= maximumStart;
}

function formatSlot(minutes: number): string {
	const hour = Math.floor(minutes / 60);
	const minute = minutes % 60;
	return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
