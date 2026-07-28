import type { DiningTableStatus } from "../../../../generated/prisma/client";
import { BranchNotFoundException } from "../../../branches/exceptions/branch-not-found.exception";
import { TableNotFoundException } from "../../exceptions/table-not-found.exception";
import { toDiningTableDto } from "../../mapper/dining-table.mapper";
import type { DiningTableRepository } from "../../repositories/dining-table.repository";
import type { UpdateDiningTableStatusInput } from "../../schemas/update-dining-table-status.schema";
import type { UpdateTableStatusUseCase } from "./update-table-status.use-case";

export class UpdateTableStatusUseCaseImpl implements UpdateTableStatusUseCase {
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
		tableId: string,
		input: UpdateDiningTableStatusInput,
	) {
		const belongs = await this.branchBelongsToRestaurant(
			branchId,
			restaurantId,
		);
		if (!belongs) {
			throw new BranchNotFoundException();
		}

		const existing = await this.tableRepository.findById(tableId);
		if (!existing || existing.branchId !== branchId) {
			throw new TableNotFoundException();
		}

		// Mapear entrada minúscula al enum de Prisma
		const statusEnum: DiningTableStatus =
			input.status === "active" ? "ACTIVE" : "INACTIVE";

		const updated = await this.tableRepository.updateStatus(
			tableId,
			statusEnum,
		);

		return toDiningTableDto(updated);
	}
}
