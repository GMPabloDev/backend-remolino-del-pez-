import type { SafeUser } from "../../../../shared/users/safe-user.dto";

export interface LoginResult {
	accessToken: string;
	refreshToken: string;
	user: SafeUser;
}

export interface LoginUseCase {
	execute(input: { email: string; password: string }): Promise<LoginResult>;
}
