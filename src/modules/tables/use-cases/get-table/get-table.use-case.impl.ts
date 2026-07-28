import { BranchNotFoundException } from "../../../branches/exceptions/branch-not-found.exception";
import { TableNotFoundException } from "../../exceptions/table-not-found.exception";
import { toDiningTableDto } from "../../mapper/dining-table.mapper";
import type { DiningTableRepository } from "../../repositories/dining-table.repository";
import type { GetTableUseCase } from "./get-table.use-case";

export class GetTableUseCaseImpl implements GetTableUseCase {
	constructor(
		private readonly tableRepository: DiningTableRepository,
		private readonly branchBelongsToRestaurant: (
			branchId: string,
			restaurantId: string,
		) => Promise<boolean>,
	) {}

	async execute(restaurantId: string, branchId: string, tableId: string) {
		const belongs =
			await this.branchBelongsToRestaurant(branchId, restaurantId);
		if (!belongs) {
			throw new BranchNotFoundException();
		}

		const table = await this.tableRepository.findById(tableId);

		// La mesa no existe o no pertenece a la sucursal indicada
		if (!table || table.branchId !== branchId) {
			throw new TableNotFoundException();
		}

		return toDiningTableDto(table);
	}
}
