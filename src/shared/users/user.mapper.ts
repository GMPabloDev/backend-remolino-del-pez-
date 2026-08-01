import type { User, UserRole, UserStatus } from "../../generated/prisma/client";
import type { SafeUser } from "./safe-user.dto";

const ROLE_TO_LOWER: Record<UserRole, SafeUser["role"]> = {
	ADMIN: "admin",
	MANAGER: "manager",
	BRANCH_ADMIN: "branch_admin",
};

const STATUS_TO_LOWER: Record<UserStatus, SafeUser["status"]> = {
	ACTIVE: "active",
	INACTIVE: "inactive",
};

const ROLE_TO_ENUM: Record<SafeUser["role"], UserRole> = {
	admin: "ADMIN",
	manager: "MANAGER",
	branch_admin: "BRANCH_ADMIN",
};

const STATUS_TO_ENUM: Record<SafeUser["status"], UserStatus> = {
	active: "ACTIVE",
	inactive: "INACTIVE",
};

export function toSafeUser(user: User): SafeUser {
	const { passwordHash: _, role, status, ...rest } = user;
	return {
		...rest,
		role: ROLE_TO_LOWER[role],
		status: STATUS_TO_LOWER[status],
	};
}

export function toUserRole(role: UserRole): SafeUser["role"] {
	return ROLE_TO_LOWER[role];
}

export function toUserStatus(status: UserStatus): SafeUser["status"] {
	return STATUS_TO_LOWER[status];
}

export function fromUserRole(role: SafeUser["role"]): UserRole {
	return ROLE_TO_ENUM[role];
}

export function fromUserStatus(status: SafeUser["status"]): UserStatus {
	return STATUS_TO_ENUM[status];
}
