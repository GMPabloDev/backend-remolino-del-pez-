import type { SafeUser } from "../../dto/safe-user.dto";
import type { CreateUserInput } from "../../schemas/create-user.schema";

export interface CreateUserUseCase {
	execute(input: CreateUserInput): Promise<SafeUser>;
}
