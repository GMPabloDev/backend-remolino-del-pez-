import { Hono } from "hono";
import { publicRestaurantSlugParamsSchema } from "../../shared/slug/public-slug.schema";
import { validate } from "../../shared/validation/validation-hook";
import type { CustomerRepository } from "../customers/repositories/customer.repository";
import type { RequestCustomerMagicLinkUseCase } from "../customers/use-cases/request-customer-magic-link/request-customer-magic-link.use-case";
import { customerAuthMiddleware } from "./middleware/customer-auth.middleware";
import type { CustomerAuthContext } from "./middleware/customer-auth-context.types";
import { exchangeCustomerMagicLinkSchema } from "./schemas/exchange-customer-magic-link.schema";
import { logoutCustomerSessionSchema } from "./schemas/logout-customer-session.schema";
import { refreshCustomerSessionSchema } from "./schemas/refresh-customer-session.schema";
import { requestCustomerMagicLinkSchema } from "./schemas/request-customer-magic-link.schema";
import type { CustomerTokenService } from "./services/customer-token.service";
import type { ExchangeCustomerMagicLinkUseCase } from "./use-cases/exchange-customer-magic-link/exchange-customer-magic-link.use-case";
import type { GetCurrentCustomerUseCase } from "./use-cases/get-current-customer/get-current-customer.use-case";
import type { LogoutCustomerSessionUseCase } from "./use-cases/logout-customer-session/logout-customer-session.use-case";
import type { RefreshCustomerSessionUseCase } from "./use-cases/refresh-customer-session/refresh-customer-session.use-case";

const MAGIC_LINK_REQUEST_MESSAGE =
	"Si existe una cuenta elegible, enviaremos un enlace de acceso.";

export function createCustomerAuthRouter(deps: {
	requestCustomerMagicLinkUseCase: RequestCustomerMagicLinkUseCase;
	exchangeCustomerMagicLinkUseCase: ExchangeCustomerMagicLinkUseCase;
	refreshCustomerSessionUseCase: RefreshCustomerSessionUseCase;
	logoutCustomerSessionUseCase: LogoutCustomerSessionUseCase;
	getCurrentCustomerUseCase: GetCurrentCustomerUseCase;
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

	router.post(
		"/public/restaurants/:restaurantSlug/customer-auth/magic-links",
		validate("param", publicRestaurantSlugParamsSchema),
		validate("json", requestCustomerMagicLinkSchema),
		async (c) => {
			const params = c.req.valid("param");
			const input = c.req.valid("json");
			await deps.requestCustomerMagicLinkUseCase.execute({
				restaurantSlug: params.restaurantSlug,
				email: input.email,
			});
			return c.json({ message: MAGIC_LINK_REQUEST_MESSAGE }, 202);
		},
	);

	router.post(
		"/public/customer-auth/magic-links/exchange",
		validate("json", exchangeCustomerMagicLinkSchema),
		async (c) => {
			const input = c.req.valid("json");
			const result = await deps.exchangeCustomerMagicLinkUseCase.execute(
				input.token,
			);
			return c.json(result, 200);
		},
	);

	router.post(
		"/customer-auth/refresh",
		validate("json", refreshCustomerSessionSchema),
		async (c) => {
			const input = c.req.valid("json");
			const result = await deps.refreshCustomerSessionUseCase.execute(
				input.refreshToken,
			);
			return c.json(result, 200);
		},
	);

	router.post(
		"/customer-auth/logout",
		validate("json", logoutCustomerSessionSchema),
		async (c) => {
			const input = c.req.valid("json");
			await deps.logoutCustomerSessionUseCase.execute(input.refreshToken);
			return c.body(null, 204);
		},
	);

	router.get("/customer-auth/me", customerAuth, async (c) => {
		const auth = c.get("customerAuth");
		const result = await deps.getCurrentCustomerUseCase.execute(
			auth.customerId,
		);
		return c.json(result, 200);
	});

	return router;
}
