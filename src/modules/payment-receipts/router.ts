import { Hono } from "hono";
import { validate } from "../../shared/validation/validation-hook";
import { customerAuthMiddleware } from "../customer-auth/middleware/customer-auth.middleware";
import type { CustomerAuthContext } from "../customer-auth/middleware/customer-auth-context.types";
import type { CustomerTokenService } from "../customer-auth/services/customer-token.service";
import type { CustomerRepository } from "../customers/repositories/customer.repository";
import { customerReceiptParamsSchema } from "./schemas/customer-receipt-params.schema";
import type { GetPaymentReceiptDownloadUseCase } from "./use-cases/get-payment-receipt-download/get-payment-receipt-download.use-case";

export function createPaymentReceiptRouter(deps: {
	getPaymentReceiptDownload: GetPaymentReceiptDownloadUseCase;
	customerTokenService: CustomerTokenService;
	customerRepository: CustomerRepository;
}): Hono<{ Variables: { customerAuth: CustomerAuthContext } }> {
	const router = new Hono<{
		Variables: { customerAuth: CustomerAuthContext };
	}>();
	const customerAuth = customerAuthMiddleware(
		deps.customerTokenService,
		deps.customerRepository,
	);

	router.get(
		"/customer/reservations/:reservationId/receipt/download",
		customerAuth,
		validate("param", customerReceiptParamsSchema),
		async (c) => {
			const auth = c.get("customerAuth");
			const { reservationId } = c.req.valid("param");
			const result = await deps.getPaymentReceiptDownload.execute(
				auth.customerId,
				reservationId,
			);
			c.header("Cache-Control", "no-store");
			return c.json(result, 200);
		},
	);

	return router;
}
