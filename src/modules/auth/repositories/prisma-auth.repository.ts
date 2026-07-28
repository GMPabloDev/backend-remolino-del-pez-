import type { User, UserSession } from "../../../generated/prisma/client";
import { prisma } from "../../../shared/database/prisma-client";
import type { AuthRepository, CreateSessionData } from "./auth.repository";

export class PrismaAuthRepository implements AuthRepository {
	async findUserByEmail(email: string): Promise<User | null> {
		return prisma.user.findUnique({ where: { email } });
	}

	async findUserById(id: string): Promise<User | null> {
		return prisma.user.findUnique({ where: { id } });
	}

	async updateUserPasswordHash(userId: string, hash: string): Promise<void> {
		await prisma.user.update({
			where: { id: userId },
			data: { passwordHash: hash },
		});
	}

	async findSessionByRefreshTokenHash(
		hash: string,
	): Promise<UserSession | null> {
		return prisma.userSession.findFirst({
			where: { refreshTokenHash: hash },
		});
	}

	async findSessionById(id: string): Promise<UserSession | null> {
		return prisma.userSession.findUnique({ where: { id } });
	}

	async createSession(data: CreateSessionData): Promise<UserSession> {
		return prisma.userSession.create({ data });
	}

	async revokeSession(sessionId: string): Promise<void> {
		await prisma.userSession.update({
			where: { id: sessionId },
			data: { revokedAt: new Date() },
		});
	}

	async revokeAllUserSessions(userId: string): Promise<void> {
		await prisma.userSession.updateMany({
			where: { userId, revokedAt: null },
			data: { revokedAt: new Date() },
		});
	}

	async rotateSessionRefreshToken(
		sessionId: string,
		newHash: string,
		newExpiresAt: Date,
	): Promise<UserSession> {
		return prisma.userSession.update({
			where: { id: sessionId },
			data: {
				refreshTokenHash: newHash,
				expiresAt: newExpiresAt,
			},
		});
	}
}
