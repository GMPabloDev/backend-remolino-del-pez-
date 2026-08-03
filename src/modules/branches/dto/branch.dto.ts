/** Reglas de reserva de una sucursal (solo campos de negocio, sin metadatos). */
export interface BranchRulesDto {
	defaultReservationDurationMinutes: number;
	minimumAdvanceMinutes: number;
	maximumAdvanceDays: number;
	arrivalToleranceMinutes: number;
	maxPartySize: number;
}

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
	rules: BranchRulesDto;
	intervals: BranchScheduleIntervalDto[];
}
