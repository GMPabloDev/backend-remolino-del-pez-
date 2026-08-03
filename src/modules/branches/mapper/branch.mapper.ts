import { minutesToTime } from "../../../shared/time/time";
import type { BranchDto } from "../dto/branch.dto";
import type { BranchWithRelations } from "../repositories/branch.repository";

/** Convierte una sucursal Prisma al DTO público con estado en minúsculas. */
export function toBranchDto(branch: BranchWithRelations): BranchDto {
	return {
		id: branch.id,
		restaurantId: branch.restaurantId,
		slug: branch.slug,
		name: branch.name,
		code: branch.code,
		address: branch.address,
		district: branch.district,
		province: branch.province,
		department: branch.department,
		phone: branch.phone,
		email: branch.email,
		status: branch.status === "ACTIVE" ? "active" : "inactive",
		createdAt: branch.createdAt.toISOString(),
		updatedAt: branch.updatedAt.toISOString(),
		rules: toRulesDto(branch.rules),
		intervals: branch.intervals.map(toIntervalDto),
	};
}

function toRulesDto(rules: {
	defaultReservationDurationMinutes: number;
	minimumAdvanceMinutes: number;
	maximumAdvanceDays: number;
	arrivalToleranceMinutes: number;
	maxPartySize: number;
}) {
	return {
		defaultReservationDurationMinutes: rules.defaultReservationDurationMinutes,
		minimumAdvanceMinutes: rules.minimumAdvanceMinutes,
		maximumAdvanceDays: rules.maximumAdvanceDays,
		arrivalToleranceMinutes: rules.arrivalToleranceMinutes,
		maxPartySize: rules.maxPartySize,
	};
}

function toIntervalDto(interval: {
	dayOfWeek: number;
	startMinute: number;
	endMinute: number;
}) {
	return {
		dayOfWeek: interval.dayOfWeek,
		startTime: minutesToTime(interval.startMinute),
		endTime: minutesToTime(interval.endMinute),
	};
}
