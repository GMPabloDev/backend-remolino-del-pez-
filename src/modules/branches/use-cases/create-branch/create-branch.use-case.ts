import type { BranchDto } from "../../dto/branch.dto";
import type { CreateBranchInput } from "../../schemas/create-branch.schema";

export interface CreateBranchUseCase {
	execute(restaurantId: string, input: CreateBranchInput): Promise<BranchDto>;
}
