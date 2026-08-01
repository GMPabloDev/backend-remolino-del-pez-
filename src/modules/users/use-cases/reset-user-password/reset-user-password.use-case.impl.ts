import type { PasswordService } from "../../../../shared/security/password.service";
import type { SafeUser } from "../../../../shared/users/safe-user.dto";
import { toSafeUser } from "../../../../shared/users/user.mapper";
import { UserNotFoundException } from "../../exceptions/user-not-found.exception";
import type { UserRepository } from "../../repositories/user.repository";
import type { ResetUserPasswordInput } from "../../schemas/reset-user-password.schema";
import type { ResetUserPasswordUseCase } from "./reset-user-password.use-case";

export class ResetUserPasswordUseCaseImpl implements ResetUserPasswordUseCase {
	constructor(
		private readonly userRepository: UserRepository,
		private readonly passwordService: PasswordService,
	) {}

	async execute(
		userId: string,
		input: ResetUserPasswordInput,
	): Promise<SafeUser> {
		const user = await this.userRepository.findById(userId);
		if (!user) {
			throw new UserNotFoundException();
		}

		const passwordHash = await this.passwordService.hash(input.password);

		// Actualizar contraseña y revocar todas las sesiones en una misma operación
		const [updated] = await Promise.all([
			this.userRepository.update(userId, { passwordHash }),
			this.userRepository.revokeAllSessions(userId),
		]);

		return toSafeUser(updated);
	}
}
