import type { SafeUser } from "../../../../shared/users/safe-user.dto";

export interface RefreshSessionResult {
	accessToken: string;
	refreshToken: string;
	user: SafeUser;
}

export interface RefreshSessionUseCase {
	execute(input: { refreshToken: string }): Promise<RefreshSessionResult>;
}
