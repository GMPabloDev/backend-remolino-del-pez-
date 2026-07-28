import type { UserRole, UserStatus } from "../../../../generated/prisma/client";
import type { SafeUser } from "../../dto/safe-user.dto";
import type { UserRepository } from "../../repositories/user.repository";
import type { ListUsersFilters, ListUsersUseCase } from "./list-users.use-case";

const ROLE_MAP: Record<string, UserRole> = {
	admin: "ADMIN",
	manager: "MANAGER",
	branch_admin: "BRANCH_ADMIN",
};

const STATUS_MAP: Record<string, UserStatus> = {
	active: "ACTIVE",
	inactive: "INACTIVE",
};

export class ListUsersUseCaseImpl implements ListUsersUseCase {
	constructor(private readonly userRepository: UserRepository) {}

	async execute(filters: ListUsersFilters): Promise<SafeUser[]> {
		const users = await this.userRepository.findAll({
			role: filters.role ? ROLE_MAP[filters.role] : undefined,
			status: filters.status ? STATUS_MAP[filters.status] : undefined,
			branchId: filters.branchId,
		});

		return users.map(({ passwordHash: _, ...safe }) => safe as SafeUser);
	}
}
