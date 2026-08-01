import { env } from "../../../../shared/config/env";
import type { PasswordService } from "../../../../shared/security/password.service";
import type { TokenService } from "../../../../shared/security/token.service";
import { toSafeUser } from "../../../../shared/users/user.mapper";
import { InvalidCredentialsException } from "../../exceptions/invalid-credentials.exception";
import type { AuthRepository } from "../../repositories/auth.repository";
import type { LoginResult, LoginUseCase } from "./login.use-case";

export class LoginUseCaseImpl implements LoginUseCase {
	constructor(
		private readonly authRepository: AuthRepository,
		private readonly passwordService: PasswordService,
		private readonly tokenService: TokenService,
	) {}

	async execute(input: {
		email: string;
		password: string;
	}): Promise<LoginResult> {
		const normalizedEmail = input.email.toLowerCase().trim();

		const user = await this.authRepository.findUserByEmail(normalizedEmail);

		// No revelar si el email existe o está inactivo
		if (!user || user.status === "INACTIVE") {
			throw new InvalidCredentialsException();
		}

		const passwordValid = await this.passwordService.verify(
			input.password,
			user.passwordHash,
		);

		if (!passwordValid) {
			throw new InvalidCredentialsException();
		}

		// Generar refresh token y su hash
		const refreshToken = this.tokenService.generateRefreshToken();
		const refreshTokenHash = this.tokenService.hashToken(refreshToken);
		const refreshTokenTtlMs = env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
		const expiresAt = new Date(Date.now() + refreshTokenTtlMs);

		// Crear sesión
		const session = await this.authRepository.createSession({
			userId: user.id,
			refreshTokenHash,
			expiresAt,
		});

		// Generar access token
		const accessToken = await this.tokenService.generateAccessToken({
			sub: user.id,
			sid: session.id,
		});

		const safeUser = toSafeUser(user);

		return {
			accessToken,
			refreshToken,
			user: safeUser,
		};
	}
}
