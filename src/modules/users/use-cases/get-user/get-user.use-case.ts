import type { SafeUser } from "../../../../shared/users/safe-user.dto";

export interface GetUserUseCase {
	execute(userId: string): Promise<SafeUser>;
}
