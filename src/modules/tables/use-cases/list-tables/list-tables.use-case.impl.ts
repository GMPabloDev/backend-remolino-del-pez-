import type { DiningTableStatus } from "../../../../generated/prisma/client";
import { BranchNotFoundException } from "../../../branches/exceptions/branch-not-found.exception";
import { toDiningTableDto } from "../../mapper/dining-table.mapper";
import type { DiningTableRepository } from "../../repositories/dining-table.repository";
import type { ListTablesUseCase } from "./list-tables.use-case";

export class ListTablesUseCaseImpl implements ListTablesUseCase {
	constructor(
		private readonly tableRepository: DiningTableRepository,
		private readonly branchBelongsToRestaurant: (
			branchId: string,
			restaurantId: string,
		) => Promise<boolean>,
	) {}

	async execute(
		restaurantId: string,
		branchId: string,
		status?: DiningTableStatus,
	) {
		const belongs =
			await this.branchBelongsToRestaurant(branchId, restaurantId);
		if (!belongs) {
			throw new BranchNotFoundException();
		}

		const tables = await this.tableRepository.findByBranchId(
			branchId,
			status,
		);

		return tables.map(toDiningTableDto);
	}
}
