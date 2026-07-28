import type { User } from "../../../generated/prisma/client";

/** Perfil público del usuario, sin passwordHash ni sesiones. */
export type SafeUser = Omit<User, "passwordHash">;
