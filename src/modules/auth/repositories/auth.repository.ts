import type { User, UserSession } from "../../../generated/prisma/client";

export interface CreateSessionData {
	userId: string;
	refreshTokenHash: string;
	expiresAt: Date;
}

export interface AuthRepository {
	findUserByEmail(email: string): Promise<User | null>;
	findUserById(id: string): Promise<User | null>;
	updateUserPasswordHash(userId: string, hash: string): Promise<void>;
	findSessionById(id: string): Promise<UserSession | null>;
	findSessionByRefreshTokenHash(hash: string): Promise<UserSession | null>;
	createSession(data: CreateSessionData): Promise<UserSession>;
	revokeSession(sessionId: string): Promise<void>;
	revokeAllUserSessions(userId: string): Promise<void>;
	rotateSessionRefreshToken(
		sessionId: string,
		newHash: string,
		newExpiresAt: Date,
	): Promise<UserSession>;
}
