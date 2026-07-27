import { BranchNotFoundException } from "../../exceptions/branch-not-found.exception";
import { BranchScheduleConflictException } from "../../exceptions/branch-schedule-conflict.exception";
import type {
	BranchRepository,
	BranchWithRelations,
	CreateIntervalData,
} from "../../repositories/branch.repository";
import type { ReplaceScheduleInput } from "../../schemas/replace-schedule.schema";
import { timeToMinutes } from "../../schemas/replace-schedule.schema";
import type { ReplaceBranchScheduleUseCase } from "./replace-branch-schedule.use-case";

/**
 * Verifica que los intervalos de cada día no se solapen.
 */
function hasOverlaps(
	intervals: { dayOfWeek: number; startMinute: number; endMinute: number }[],
): boolean {
	const grouped = new Map<number, { start: number; end: number }[]>();

	for (const interval of intervals) {
		const list = grouped.get(interval.dayOfWeek) ?? [];
		list.push({ start: interval.startMinute, end: interval.endMinute });
		grouped.set(interval.dayOfWeek, list);
	}

	for (const list of grouped.values()) {
		list.sort((a, b) => a.start - b.start);
		for (let i = 1; i < list.length; i++) {
			if (list[i].start < list[i - 1].end) {
				return true;
			}
		}
	}

	return false;
}

export class ReplaceBranchScheduleUseCaseImpl
	implements ReplaceBranchScheduleUseCase
{
	constructor(private readonly branchRepository: BranchRepository) {}

	async execute(
		restaurantId: string,
		branchId: string,
		input: ReplaceScheduleInput,
	): Promise<BranchWithRelations> {
		const branch = await this.branchRepository.findById(branchId);

		if (!branch || branch.restaurantId !== restaurantId) {
			throw new BranchNotFoundException();
		}

		const intervals: CreateIntervalData[] = input.intervals.map((i) => ({
			dayOfWeek: i.dayOfWeek,
			startMinute: timeToMinutes(i.startTime),
			endMinute: timeToMinutes(i.endTime),
		}));

		if (hasOverlaps(intervals)) {
			throw new BranchScheduleConflictException();
		}

		return this.branchRepository.replaceIntervals(branchId, intervals);
	}
}
