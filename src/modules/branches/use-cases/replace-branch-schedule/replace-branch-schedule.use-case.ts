import type { BranchWithRelations } from "../../repositories/branch.repository";
import type { ReplaceScheduleInput } from "../../schemas/replace-schedule.schema";

export interface ReplaceBranchScheduleUseCase {
  execute(restaurantId: string, branchId: string, input: ReplaceScheduleInput): Promise<BranchWithRelations>;
}
