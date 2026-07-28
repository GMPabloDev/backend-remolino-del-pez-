import type { SafeUser } from "../../dto/safe-user.dto";

export interface GetUserUseCase {
	execute(userId: string): Promise<SafeUser>;
}
