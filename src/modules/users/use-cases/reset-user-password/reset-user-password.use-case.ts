import type { SafeUser } from "../../dto/safe-user.dto";
import type { ResetUserPasswordInput } from "../../schemas/reset-user-password.schema";

export interface ResetUserPasswordUseCase {
	execute(userId: string, input: ResetUserPasswordInput): Promise<SafeUser>;
}
