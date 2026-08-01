import type { BranchDto } from "../../dto/branch.dto";
import type { ReplaceScheduleInput } from "../../schemas/replace-schedule.schema";

export interface ReplaceBranchScheduleUseCase {
	execute(
		restaurantId: string,
		branchId: string,
		input: ReplaceScheduleInput,
	): Promise<BranchDto>;
}
