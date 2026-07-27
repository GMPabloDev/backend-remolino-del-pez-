import { BranchNotFoundException } from "../../exceptions/branch-not-found.exception";
import type {
	BranchRepository,
	BranchWithRelations,
} from "../../repositories/branch.repository";
import type { GetBranchUseCase } from "./get-branch.use-case";

export class GetBranchUseCaseImpl implements GetBranchUseCase {
	constructor(private readonly branchRepository: BranchRepository) {}

	async execute(
		restaurantId: string,
		branchId: string,
	): Promise<BranchWithRelations> {
		const branch = await this.branchRepository.findById(branchId);

		// La sucursal no existe o no pertenece al restaurante indicado
		if (!branch || branch.restaurantId !== restaurantId) {
			throw new BranchNotFoundException();
		}

		return branch;
	}
}
