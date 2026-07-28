import { BranchNotFoundException } from "../../../branches/exceptions/branch-not-found.exception";
import { TableCodeAlreadyExistsException } from "../../exceptions/table-code-already-exists.exception";
import { TableNotFoundException } from "../../exceptions/table-not-found.exception";
import { toDiningTableDto } from "../../mapper/dining-table.mapper";
import type { DiningTableRepository } from "../../repositories/dining-table.repository";
import type { UpdateDiningTableInput } from "../../schemas/update-dining-table.schema";
import type { UpdateTableUseCase } from "./update-table.use-case";

export class UpdateTableUseCaseImpl implements UpdateTableUseCase {
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
		input: UpdateDiningTableInput,
	) {
		const belongs =
			await this.branchBelongsToRestaurant(branchId, restaurantId);
		if (!belongs) {
			throw new BranchNotFoundException();
		}

		const existing = await this.tableRepository.findById(tableId);
		if (!existing || existing.branchId !== branchId) {
			throw new TableNotFoundException();
		}

		// Verificar unicidad del código si se está cambiando
		if (input.code !== undefined && input.code !== existing.code) {
			const count = await this.tableRepository.countByBranchAndCode(
				branchId,
				input.code,
			);
			if (count > 0) {
				throw new TableCodeAlreadyExistsException();
			}
		}

		const updated = await this.tableRepository.update(tableId, {
			code: input.code,
			capacity: input.capacity,
		});

		return toDiningTableDto(updated);
	}
}
