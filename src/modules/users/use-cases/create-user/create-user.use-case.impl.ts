import type { UserRole } from "../../../../generated/prisma/client";
import type { PasswordService } from "../../../../shared/security/password.service";
import type { SafeUser } from "../../dto/safe-user.dto";
import { InvalidRoleBranchException } from "../../exceptions/invalid-role-branch.exception";
import { UserEmailAlreadyExistsException } from "../../exceptions/user-email-already-exists.exception";
import type { UserRepository } from "../../repositories/user.repository";
import type { CreateUserInput } from "../../schemas/create-user.schema";
import type { CreateUserUseCase } from "./create-user.use-case";

const ROLE_MAP: Record<string, UserRole> = {
	admin: "ADMIN",
	manager: "MANAGER",
	branch_admin: "BRANCH_ADMIN",
};

export class CreateUserUseCaseImpl implements CreateUserUseCase {
	constructor(
		private readonly userRepository: UserRepository,
		private readonly passwordService: PasswordService,
		private readonly branchExists: (id: string) => Promise<boolean>,
	) {}

	async execute(input: CreateUserInput): Promise<SafeUser> {
		const normalizedEmail = input.email.toLowerCase().trim();

		const existing = await this.userRepository.findByEmail(normalizedEmail);
		if (existing) {
			throw new UserEmailAlreadyExistsException();
		}

		const role = ROLE_MAP[input.role];

		// Validar relación rol-sucursal
		if (role === "BRANCH_ADMIN") {
			if (!input.branchId) {
				throw new InvalidRoleBranchException(
					"El rol branch_admin requiere una sucursal asignada",
				);
			}
			const exists = await this.branchExists(input.branchId);
			if (!exists) {
				throw new InvalidRoleBranchException("La sucursal asignada no existe");
			}
		}

		if ((role === "ADMIN" || role === "MANAGER") && input.branchId) {
			throw new InvalidRoleBranchException(
				"Los roles admin y manager no pueden tener sucursal asignada",
			);
		}

		const passwordHash = await this.passwordService.hash(input.password);

		const user = await this.userRepository.create({
			fullName: input.fullName,
			email: normalizedEmail,
			phone: input.phone ?? null,
			passwordHash,
			role,
			branchId: input.branchId ?? null,
		});

		const { passwordHash: _, ...safeUser } = user;
		return safeUser as SafeUser;
	}
}
