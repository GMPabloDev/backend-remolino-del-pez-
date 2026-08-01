import type { User } from "../../generated/prisma/client";

/** Perfil de usuario sin passwordHash. `role` y `status` en minúsculas. */
export type SafeUser = Omit<User, "passwordHash" | "role" | "status"> & {
	role: "admin" | "manager" | "branch_admin";
	status: "active" | "inactive";
};
