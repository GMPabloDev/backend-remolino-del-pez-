import type { DiningTableDto } from "../../dto/dining-table.dto";

export interface GetTableUseCase {
	execute(
		restaurantId: string,
		branchId: string,
		tableId: string,
	): Promise<DiningTableDto>;
}
