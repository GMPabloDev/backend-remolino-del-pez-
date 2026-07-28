import type { DiningTableDto } from "../../dto/dining-table.dto";
import type { CreateDiningTableInput } from "../../schemas/create-dining-table.schema";

export interface CreateTableUseCase {
	execute(
		restaurantId: string,
		branchId: string,
		input: CreateDiningTableInput,
	): Promise<DiningTableDto>;
}
