import type { UserRole, UserStatus } from "../../../generated/prisma/client";

export interface AuthContext {
	userId: string;
	sessionId: string;
	userRole: UserRole;
	userStatus: UserStatus;
	userBranchId: string | null;
}
