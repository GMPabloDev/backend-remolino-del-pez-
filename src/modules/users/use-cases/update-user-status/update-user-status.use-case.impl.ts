import type { UserStatus } from "../../../../generated/prisma/client";
import type { SafeUser } from "../../dto/safe-user.dto";
import { LastAdminRequiredException } from "../../exceptions/last-admin-required.exception";
import { UserNotFoundException } from "../../exceptions/user-not-found.exception";
import type { UserRepository } from "../../repositories/user.repository";
import type { UpdateUserStatusInput } from "../../schemas/update-user-status.schema";
import type { UpdateUserStatusUseCase } from "./update-user-status.use-case";

const STATUS_MAP: Record<string, UserStatus> = {
	active: "ACTIVE",
	inactive: "INACTIVE",
};

export class UpdateUserStatusUseCaseImpl implements UpdateUserStatusUseCase {
	constructor(private readonly userRepository: UserRepository) {}

	async execute(
		userId: string,
		input: UpdateUserStatusInput,
	): Promise<SafeUser> {
		const user = await this.userRepository.findById(userId);
		if (!user) {
			throw new UserNotFoundException();
		}

		const newStatus = STATUS_MAP[input.status];

		// Proteger al último admin activo
		if (
			user.role === "ADMIN" &&
			user.status === "ACTIVE" &&
			newStatus === "INACTIVE"
		) {
			const activeAdmins = await this.userRepository.countActiveAdmins();
			if (activeAdmins <= 1) {
				throw new LastAdminRequiredException();
			}
		}

		// Si se desactiva, revocar todas las sesiones
		if (newStatus === "INACTIVE") {
			await this.userRepository.revokeAllSessions(userId);
		}

		const updated = await this.userRepository.updateStatus(userId, newStatus);

		const { passwordHash: _, ...safeUser } = updated;
		return safeUser as SafeUser;
	}
}
