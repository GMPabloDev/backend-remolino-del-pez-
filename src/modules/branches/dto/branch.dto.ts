import type { BranchRules } from "../../../generated/prisma/client";

/** Intervalo de horario de una sucursal, con horas en formato HH:mm. */
export interface BranchScheduleIntervalDto {
	dayOfWeek: number;
	startTime: string;
	endTime: string;
}

/** Representación pública de una sucursal, con estado en minúsculas. */
export interface BranchDto {
	id: string;
	restaurantId: string;
	slug: string;
	name: string;
	code: string;
	address: string;
	district: string;
	province: string;
	department: string;
	phone: string;
	email: string | null;
	status: "active" | "inactive";
	createdAt: string;
	updatedAt: string;
	rules: BranchRules;
	intervals: BranchScheduleIntervalDto[];
}
