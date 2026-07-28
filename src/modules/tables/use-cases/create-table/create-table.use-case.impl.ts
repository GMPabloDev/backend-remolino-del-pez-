import { BranchNotFoundException } from "../../../branches/exceptions/branch-not-found.exception";
import { TableCodeAlreadyExistsException } from "../../exceptions/table-code-already-exists.exception";
import { toDiningTableDto } from "../../mapper/dining-table.mapper";
import type { DiningTableRepository } from "../../repositories/dining-table.repository";
import type { CreateDiningTableInput } from "../../schemas/create-dining-table.schema";
import type { CreateTableUseCase } from "./create-table.use-case";

export class CreateTableUseCaseImpl implements CreateTableUseCase {
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
		input: CreateDiningTableInput,
	) {
		const belongs = await this.branchBelongsToRestaurant(
			branchId,
			restaurantId,
		);
		if (!belongs) {
			throw new BranchNotFoundException();
		}

		const normalizedCode = input.code; // ya normalizado por Zod

		const count = await this.tableRepository.countByBranchAndCode(
			branchId,
			normalizedCode,
		);
		if (count > 0) {
			throw new TableCodeAlreadyExistsException();
		}

		const table = await this.tableRepository.create({
			branchId,
			code: normalizedCode,
			capacity: input.capacity,
		});

		return toDiningTableDto(table);
	}
}
