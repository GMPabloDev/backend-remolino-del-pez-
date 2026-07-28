import type { UserRole } from "../../../../generated/prisma/client";
import type { SafeUser } from "../../dto/safe-user.dto";
import { InvalidRoleBranchException } from "../../exceptions/invalid-role-branch.exception";
import { LastAdminRequiredException } from "../../exceptions/last-admin-required.exception";
import { UserEmailAlreadyExistsException } from "../../exceptions/user-email-already-exists.exception";
import { UserNotFoundException } from "../../exceptions/user-not-found.exception";
import type { UserRepository } from "../../repositories/user.repository";
import type { UpdateUserInput } from "../../schemas/update-user.schema";
import type { UpdateUserUseCase } from "./update-user.use-case";

const ROLE_MAP: Record<string, UserRole> = {
	admin: "ADMIN",
	manager: "MANAGER",
	branch_admin: "BRANCH_ADMIN",
};

export class UpdateUserUseCaseImpl implements UpdateUserUseCase {
	constructor(
		private readonly userRepository: UserRepository,
		private readonly branchExists: (id: string) => Promise<boolean>,
	) {}

	async execute(userId: string, input: UpdateUserInput): Promise<SafeUser> {
		const user = await this.userRepository.findById(userId);
		if (!user) {
			throw new UserNotFoundException();
		}

		const newRole = input.role ? ROLE_MAP[input.role] : undefined;
		const effectiveRole = newRole ?? user.role;

		// Validar que no se degrade/desactive al último admin
		if (this.wouldRemoveLastAdmin(user, newRole)) {
			const activeAdmins = await this.userRepository.countActiveAdmins();
			if (activeAdmins <= 1) {
				throw new LastAdminRequiredException();
			}
		}

		// Validar email único si cambia
		if (input.email) {
			const normalizedEmail = input.email.toLowerCase().trim();
			const existing = await this.userRepository.findByEmail(normalizedEmail);
			if (existing && existing.id !== userId) {
				throw new UserEmailAlreadyExistsException();
			}
		}

		// Validar relación rol-sucursal
		await this.validateRoleBranch(effectiveRole, input.branchId, user.branchId);

		const updateData: Record<string, unknown> = {};

		if (input.fullName !== undefined) updateData.fullName = input.fullName;
		if (input.email !== undefined)
			updateData.email = input.email.toLowerCase().trim();
		if (input.phone !== undefined) updateData.phone = input.phone;
		if (newRole !== undefined) updateData.role = newRole;
		if (input.branchId !== undefined) updateData.branchId = input.branchId;

		const updated = await this.userRepository.update(userId, updateData);

		const { passwordHash: _, ...safeUser } = updated;
		return safeUser as SafeUser;
	}

	private wouldRemoveLastAdmin(
		user: { role: UserRole; status: string },
		newRole?: UserRole,
	): boolean {
		if (user.role !== "ADMIN") return false;
		if (!newRole) return false;
		return newRole !== "ADMIN";
	}

	private async validateRoleBranch(
		role: UserRole,
		inputBranchId: string | null | undefined,
		currentBranchId: string | null,
	): Promise<void> {
		const effectiveBranchId =
			inputBranchId !== undefined ? inputBranchId : currentBranchId;

		if (role === "BRANCH_ADMIN") {
			if (!effectiveBranchId) {
				throw new InvalidRoleBranchException(
					"El rol branch_admin requiere una sucursal asignada",
				);
			}
			const exists = await this.branchExists(effectiveBranchId);
			if (!exists) {
				throw new InvalidRoleBranchException("La sucursal asignada no existe");
			}
		}

		if ((role === "ADMIN" || role === "MANAGER") && effectiveBranchId) {
			throw new InvalidRoleBranchException(
				"Los roles admin y manager no pueden tener sucursal asignada",
			);
		}
	}
}
