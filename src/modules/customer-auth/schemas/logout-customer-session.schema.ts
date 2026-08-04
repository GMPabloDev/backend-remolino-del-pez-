import { z } from "zod";
import { customerRefreshTokenSchema } from "./refresh-customer-session.schema";

export const logoutCustomerSessionSchema = z.object({
	refreshToken: customerRefreshTokenSchema,
});

export type LogoutCustomerSessionInput = z.infer<
	typeof logoutCustomerSessionSchema
>;
