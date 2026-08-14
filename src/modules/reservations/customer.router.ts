import { Hono } from "hono";
import { customerAuthMiddleware } from "../customer-auth/middleware/customer-auth.middleware";
import type { CustomerAuthContext } from "../customer-auth/middleware/customer-auth-context.types";
import type { CustomerTokenService } from "../customer-auth/services/customer-token.service";
import type { CustomerRepository } from "../customers/repositories/customer.repository";
import type { ListCustomerReservationsUseCase } from "./use-cases/list-customer-reservations/list-customer-reservations.use-case";

export function createCustomerReservationRouter(deps: {
	listCustomerReservations: ListCustomerReservationsUseCase;
	customerTokenService: CustomerTokenService;
	customerRepository: CustomerRepository;
}): Hono<{ Variables: { customerAuth: CustomerAuthContext } }> {
	const router = new Hono<{
		Variables: { customerAuth: CustomerAuthContext };
	}>();

	router.get(
		"/customer/reservations",
		customerAuthMiddleware(deps.customerTokenService, deps.customerRepository),
		async (c) => {
			const auth = c.get("customerAuth");
			const reservations = await deps.listCustomerReservations.execute(
				auth.customerId,
			);
			return c.json(reservations, 200);
		},
	);

	return router;
}
