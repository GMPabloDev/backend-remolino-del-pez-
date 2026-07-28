import type { DiningTableDto } from "../../dto/dining-table.dto";
import type { UpdateDiningTableInput } from "../../schemas/update-dining-table.schema";

export interface UpdateTableUseCase {
	execute(
		restaurantId: string,
		branchId: string,
		tableId: string,
		input: UpdateDiningTableInput,
	): Promise<DiningTableDto>;
}
