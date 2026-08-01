import type { SafeUser } from "../../../../shared/users/safe-user.dto";

export interface ListUsersUseCase {
	execute(filters: ListUsersFilters): Promise<SafeUser[]>;
}

export interface ListUsersFilters {
	role?: "admin" | "manager" | "branch_admin";
	status?: "active" | "inactive";
	branchId?: string;
}
