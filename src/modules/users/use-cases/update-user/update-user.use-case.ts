import type { SafeUser } from "../../../../shared/users/safe-user.dto";
import type { UpdateUserInput } from "../../schemas/update-user.schema";

export interface UpdateUserUseCase {
	execute(userId: string, input: UpdateUserInput): Promise<SafeUser>;
}
