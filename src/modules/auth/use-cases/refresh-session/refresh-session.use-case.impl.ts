import { env } from "../../../../shared/config/env";
import type { TokenService } from "../../../../shared/security/token.service";
import { InvalidRefreshTokenException } from "../../exceptions/invalid-refresh-token.exception";
import type { AuthRepository } from "../../repositories/auth.repository";
import type {
	RefreshSessionResult,
	RefreshSessionUseCase,
} from "./refresh-session.use-case";

export class RefreshSessionUseCaseImpl implements RefreshSessionUseCase {
	constructor(
		private readonly authRepository: AuthRepository,
		private readonly tokenService: TokenService,
	) {}

	async execute(input: {
		refreshToken: string;
	}): Promise<RefreshSessionResult> {
		const tokenHash = this.tokenService.hashToken(input.refreshToken);

		const session =
			await this.authRepository.findSessionByRefreshTokenHash(tokenHash);

		if (!session) {
			throw new InvalidRefreshTokenException();
		}

		// Detectar reutilización: sesión ya revocada → posible robo
		if (session.revokedAt) {
			await this.authRepository.revokeAllUserSessions(session.userId);
			throw new InvalidRefreshTokenException();
		}

		// Verificar expiración
		if (session.expiresAt < new Date()) {
			throw new InvalidRefreshTokenException();
		}

		// Rotar refresh token
		const newRefreshToken = this.tokenService.generateRefreshToken();
		const newRefreshTokenHash = this.tokenService.hashToken(newRefreshToken);
		const refreshTokenTtlMs = env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
		const newExpiresAt = new Date(Date.now() + refreshTokenTtlMs);

		const updatedSession = await this.authRepository.rotateSessionRefreshToken(
			session.id,
			newRefreshTokenHash,
			newExpiresAt,
		);

		// Generar nuevo access token
		const accessToken = await this.tokenService.generateAccessToken({
			sub: updatedSession.userId,
			sid: updatedSession.id,
		});

		// Obtener datos frescos del usuario
		const user = await this.authRepository.findUserById(updatedSession.userId);

		if (!user) {
			throw new InvalidRefreshTokenException();
		}

		const { passwordHash: _, ...safeUser } = user;

		return {
			accessToken,
			refreshToken: newRefreshToken,
			user: safeUser,
		};
	}
}
