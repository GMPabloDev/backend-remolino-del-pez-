import type { BranchStatus } from "../../../../generated/prisma/client";
import { RestaurantNotFoundException } from "../../../restaurants/exceptions/restaurant-not-found.exception";
import type { BranchDto } from "../../dto/branch.dto";
import { toBranchDto } from "../../mapper/branch.mapper";
import type { BranchRepository } from "../../repositories/branch.repository";
import type { ListBranchesUseCase } from "./list-branches.use-case";

export class ListBranchesUseCaseImpl implements ListBranchesUseCase {
	constructor(
		private readonly branchRepository: BranchRepository,
		private readonly restaurantExists: (id: string) => Promise<boolean>,
	) {}

	async execute(
		restaurantId: string,
		status?: BranchStatus,
		assignedBranchId?: string,
	): Promise<BranchDto[]> {
		const exists = await this.restaurantExists(restaurantId);
		if (!exists) {
			throw new RestaurantNotFoundException();
		}

		const branches = await this.branchRepository.findByRestaurantId(
			restaurantId,
			status,
		);

		// BRANCH_ADMIN solo ve su sucursal asignada
		const visible = assignedBranchId
			? branches.filter((b) => b.id === assignedBranchId)
			: branches;

		return visible.map(toBranchDto);
	}
}
