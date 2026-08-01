import type { SafeUser } from "../../../../shared/users/safe-user.dto";
import type { CreateUserInput } from "../../schemas/create-user.schema";

export interface CreateUserUseCase {
	execute(input: CreateUserInput): Promise<SafeUser>;
}
