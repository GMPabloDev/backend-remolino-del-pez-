import type { SafeUser } from "../../../../shared/users/safe-user.dto";
import {
	fromUserRole,
	fromUserStatus,
	toSafeUser,
} from "../../../../shared/users/user.mapper";
import type { UserRepository } from "../../repositories/user.repository";
import type { ListUsersFilters, ListUsersUseCase } from "./list-users.use-case";

export class ListUsersUseCaseImpl implements ListUsersUseCase {
	constructor(private readonly userRepository: UserRepository) {}

	async execute(filters: ListUsersFilters): Promise<SafeUser[]> {
		const users = await this.userRepository.findAll({
			role: filters.role ? fromUserRole(filters.role) : undefined,
			status: filters.status ? fromUserStatus(filters.status) : undefined,
			branchId: filters.branchId,
		});

		return users.map(toSafeUser);
	}
}
