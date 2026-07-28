import type { PasswordService } from "../../../../shared/security/password.service";
import { InvalidCredentialsException } from "../../exceptions/invalid-credentials.exception";
import type { AuthRepository } from "../../repositories/auth.repository";
import type { ChangePasswordUseCase } from "./change-password.use-case";

export class ChangePasswordUseCaseImpl implements ChangePasswordUseCase {
	constructor(
		private readonly authRepository: AuthRepository,
		private readonly passwordService: PasswordService,
	) {}

	async execute(
		userId: string,
		input: { currentPassword: string; newPassword: string },
	): Promise<void> {
		const user = await this.authRepository.findUserById(userId);

		if (!user) {
			throw new InvalidCredentialsException();
		}

		const valid = await this.passwordService.verify(
			input.currentPassword,
			user.passwordHash,
		);

		if (!valid) {
			throw new InvalidCredentialsException();
		}

		const newHash = await this.passwordService.hash(input.newPassword);

		// Actualizar contraseña y revocar todas las sesiones en paralelo
		await Promise.all([
			this.authRepository.updateUserPasswordHash(userId, newHash),
			this.authRepository.revokeAllUserSessions(userId),
		]);
	}
}
