import type { BranchDto } from "../../dto/branch.dto";
import { BranchNotFoundException } from "../../exceptions/branch-not-found.exception";
import { toBranchDto } from "../../mapper/branch.mapper";
import type { BranchRepository } from "../../repositories/branch.repository";
import type { GetBranchUseCase } from "./get-branch.use-case";

export class GetBranchUseCaseImpl implements GetBranchUseCase {
	constructor(private readonly branchRepository: BranchRepository) {}

	async execute(restaurantId: string, branchId: string): Promise<BranchDto> {
		const branch = await this.branchRepository.findById(branchId);

		// La sucursal no existe o no pertenece al restaurante indicado
		if (!branch || branch.restaurantId !== restaurantId) {
			throw new BranchNotFoundException();
		}

		return toBranchDto(branch);
	}
}
