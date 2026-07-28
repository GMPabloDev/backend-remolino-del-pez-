import type { User } from "../../../../generated/prisma/client";

export interface LoginResult {
	accessToken: string;
	refreshToken: string;
	user: Omit<User, "passwordHash">;
}

export interface LoginUseCase {
	execute(input: { email: string; password: string }): Promise<LoginResult>;
}
