import type { SafeUser } from "../../dto/safe-user.dto";
import type { UpdateUserStatusInput } from "../../schemas/update-user-status.schema";

export interface UpdateUserStatusUseCase {
	execute(userId: string, input: UpdateUserStatusInput): Promise<SafeUser>;
}
