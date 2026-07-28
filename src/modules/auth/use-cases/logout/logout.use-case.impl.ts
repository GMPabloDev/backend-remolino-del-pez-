import type { TokenService } from "../../../../shared/security/token.service";
import type { AuthRepository } from "../../repositories/auth.repository";
import type { LogoutUseCase } from "./logout.use-case";

export class LogoutUseCaseImpl implements LogoutUseCase {
	constructor(
		private readonly authRepository: AuthRepository,
		private readonly tokenService: TokenService,
	) {}

	async execute(input: { refreshToken: string }): Promise<void> {
		const tokenHash = this.tokenService.hashToken(input.refreshToken);

		const session =
			await this.authRepository.findSessionByRefreshTokenHash(tokenHash);

		if (!session) {
			// Token no encontrado: no hacer nada (idempotente)
			return;
		}

		await this.authRepository.revokeSession(session.id);
	}
}
