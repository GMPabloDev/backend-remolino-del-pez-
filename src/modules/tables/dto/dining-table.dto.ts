/** Representación pública de una mesa, con estado en minúsculas. */
export interface DiningTableDto {
	id: string;
	branchId: string;
	code: string;
	capacity: number;
	status: "active" | "inactive";
	createdAt: string;
	updatedAt: string;
}
