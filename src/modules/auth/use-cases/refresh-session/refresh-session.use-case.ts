import type { User } from "../../../../generated/prisma/client";

export interface RefreshSessionResult {
	accessToken: string;
	refreshToken: string;
	user: Omit<User, "passwordHash">;
}

export interface RefreshSessionUseCase {
	execute(input: { refreshToken: string }): Promise<RefreshSessionResult>;
}
