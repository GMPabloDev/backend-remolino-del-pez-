import type { BranchDto } from "../../dto/branch.dto";
import type { UpdateBranchInput } from "../../schemas/update-branch.schema";

export interface UpdateBranchUseCase {
	execute(
		restaurantId: string,
		branchId: string,
		input: UpdateBranchInput,
	): Promise<BranchDto>;
}
