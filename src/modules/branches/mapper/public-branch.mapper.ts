import type { BranchScheduleInterval } from "../../../generated/prisma/client";
import { minutesToTime } from "../../../shared/time/time";
import type { PublicBranchDto } from "../dto/public-branch.dto";
import type { BranchWithRelations } from "../repositories/branch.repository";

export function toPublicBranchDto(
	branch: BranchWithRelations,
	restaurantSlug: string,
): PublicBranchDto {
	if (!branch.rules) {
		throw new Error("La sucursal activa no tiene reglas de reserva");
	}

	return {
		restaurantSlug,
		branchSlug: branch.slug,
		name: branch.name,
		address: branch.address,
		district: branch.district,
		province: branch.province,
		department: branch.department,
		phone: branch.phone,
		email: branch.email,
		rules: {
			defaultReservationDurationMinutes:
				branch.rules.defaultReservationDurationMinutes,
			minimumAdvanceMinutes: branch.rules.minimumAdvanceMinutes,
			maximumAdvanceDays: branch.rules.maximumAdvanceDays,
			arrivalToleranceMinutes: branch.rules.arrivalToleranceMinutes,
			maxPartySize: branch.rules.maxPartySize,
		},
		intervals: branch.intervals.map(toPublicInterval),
	};
}

function toPublicInterval(interval: BranchScheduleInterval) {
	return {
		dayOfWeek: interval.dayOfWeek,
		startTime: minutesToTime(interval.startMinute),
		endTime: minutesToTime(interval.endMinute),
	};
}
