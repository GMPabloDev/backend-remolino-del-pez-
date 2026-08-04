import { Hono } from "hono";
import { cors } from "hono/cors";
import { PrismaAuthRepository } from "./modules/auth/repositories/prisma-auth.repository";
import { createAuthRouter } from "./modules/auth/router";
import { ChangePasswordUseCaseImpl } from "./modules/auth/use-cases/change-password/change-password.use-case.impl";
import { LoginUseCaseImpl } from "./modules/auth/use-cases/login/login.use-case.impl";
import { LogoutUseCaseImpl } from "./modules/auth/use-cases/logout/logout.use-case.impl";
import { RefreshSessionUseCaseImpl } from "./modules/auth/use-cases/refresh-session/refresh-session.use-case.impl";
import { createPublicBranchRouter } from "./modules/branches/public.router";
import { PrismaBranchRepository } from "./modules/branches/repositories/prisma-branch.repository";
import { createBranchRouter } from "./modules/branches/router";
import { CreateBranchUseCaseImpl } from "./modules/branches/use-cases/create-branch/create-branch.use-case.impl";
import { GetBranchUseCaseImpl } from "./modules/branches/use-cases/get-branch/get-branch.use-case.impl";
import { ListBranchesUseCaseImpl } from "./modules/branches/use-cases/list-branches/list-branches.use-case.impl";
import { ListPublicBranchesUseCaseImpl } from "./modules/branches/use-cases/list-public-branches/list-public-branches.use-case.impl";
import { ReplaceBranchScheduleUseCaseImpl } from "./modules/branches/use-cases/replace-branch-schedule/replace-branch-schedule.use-case.impl";
import { UpdateBranchUseCaseImpl } from "./modules/branches/use-cases/update-branch/update-branch.use-case.impl";
import { UpdateBranchStatusUseCaseImpl } from "./modules/branches/use-cases/update-branch-status/update-branch-status.use-case.impl";
import { createCustomerAuthRouter } from "./modules/customer-auth/router";
import { CryptoCustomerMagicLinkService } from "./modules/customer-auth/services/crypto-customer-magic-link.service";
import { JwtCustomerTokenService } from "./modules/customer-auth/services/jwt-customer-token.service";
import { ExchangeCustomerMagicLinkUseCaseImpl } from "./modules/customer-auth/use-cases/exchange-customer-magic-link/exchange-customer-magic-link.use-case.impl";
import { GetCurrentCustomerUseCaseImpl } from "./modules/customer-auth/use-cases/get-current-customer/get-current-customer.use-case.impl";
import { LogoutCustomerSessionUseCaseImpl } from "./modules/customer-auth/use-cases/logout-customer-session/logout-customer-session.use-case.impl";
import { RefreshCustomerSessionUseCaseImpl } from "./modules/customer-auth/use-cases/refresh-customer-session/refresh-customer-session.use-case.impl";
import { PrismaCustomerRepository } from "./modules/customers/repositories/prisma-customer.repository";
import { TemplateCustomerAccessEmailService } from "./modules/customers/services/template-customer-access-email.service";
import { TemplateReservationConfirmationEmailService } from "./modules/customers/services/template-reservation-confirmation-email.service";
import { RequestCustomerMagicLinkUseCaseImpl } from "./modules/customers/use-cases/request-customer-magic-link/request-customer-magic-link.use-case.impl";
import { createBranchDishRouter } from "./modules/menu/branch-dish.router";
import { createCategoryRouter } from "./modules/menu/categories.router";
import { createDishRouter } from "./modules/menu/dishes.router";
import { createPublicMenuRouter } from "./modules/menu/public-menu.router";
import { PrismaBranchDishRepository } from "./modules/menu/repositories/prisma-branch-dish.repository";
import { PrismaMenuCategoryRepository } from "./modules/menu/repositories/prisma-category.repository";
import { PrismaDishRepository } from "./modules/menu/repositories/prisma-dish.repository";
import { CreateCategoryUseCaseImpl } from "./modules/menu/use-cases/create-category/create-category.use-case.impl";
import { CreateDishUseCaseImpl } from "./modules/menu/use-cases/create-dish/create-dish.use-case.impl";
import { GetCategoryUseCaseImpl } from "./modules/menu/use-cases/get-category/get-category.use-case.impl";
import { GetDishUseCaseImpl } from "./modules/menu/use-cases/get-dish/get-dish.use-case.impl";
import { GetPublicMenuUseCaseImpl } from "./modules/menu/use-cases/get-public-menu/get-public-menu.use-case.impl";
import { ListBranchDishesUseCaseImpl } from "./modules/menu/use-cases/list-branch-dishes/list-branch-dishes.use-case.impl";
import { ListCategoriesUseCaseImpl } from "./modules/menu/use-cases/list-categories/list-categories.use-case.impl";
import { ListDishesUseCaseImpl } from "./modules/menu/use-cases/list-dishes/list-dishes.use-case.impl";
import { UpdateCategoryUseCaseImpl } from "./modules/menu/use-cases/update-category/update-category.use-case.impl";
import { UpdateCategoryStatusUseCaseImpl } from "./modules/menu/use-cases/update-category-status/update-category-status.use-case.impl";
import { UpdateDishUseCaseImpl } from "./modules/menu/use-cases/update-dish/update-dish.use-case.impl";
import { UpdateDishStatusUseCaseImpl } from "./modules/menu/use-cases/update-dish-status/update-dish-status.use-case.impl";
import { UpsertBranchDishUseCaseImpl } from "./modules/menu/use-cases/upsert-branch-dish/upsert-branch-dish.use-case.impl";
import { PrismaPaymentRepository } from "./modules/payments/repositories/prisma-payment.repository";
import { createPaymentRouter } from "./modules/payments/router";
import { StripePaymentGatewayService } from "./modules/payments/services/stripe-payment-gateway.service";
import { CreateCheckoutUseCaseImpl } from "./modules/payments/use-cases/create-checkout/create-checkout.use-case.impl";
import { GetPaymentStatusUseCaseImpl } from "./modules/payments/use-cases/get-payment-status/get-payment-status.use-case.impl";
import { ProcessStripeWebhookUseCaseImpl } from "./modules/payments/use-cases/process-stripe-webhook/process-stripe-webhook.use-case.impl";
import { createStripeWebhookRouter } from "./modules/payments/webhook.router";
import { PrismaReservationRepository } from "./modules/reservations/repositories/prisma-reservation.repository";
import { createReservationRouter } from "./modules/reservations/router";
import { HmacCheckoutTokenService } from "./modules/reservations/services/hmac-checkout-token.service";
import { CreateTemporaryReservationUseCaseImpl } from "./modules/reservations/use-cases/create-temporary-reservation/create-temporary-reservation.use-case.impl";
import { GetAvailabilityUseCaseImpl } from "./modules/reservations/use-cases/get-availability/get-availability.use-case.impl";
import { createPublicRestaurantRouter } from "./modules/restaurants/public.router";
import { PrismaRestaurantRepository } from "./modules/restaurants/repositories/prisma-restaurant.repository";
import { createRestaurantRouter } from "./modules/restaurants/router";
import { CreateRestaurantUseCaseImpl } from "./modules/restaurants/use-cases/create-restaurant/create-restaurant.use-case.impl";
import { GetPublicRestaurantUseCaseImpl } from "./modules/restaurants/use-cases/get-public-restaurant/get-public-restaurant.use-case.impl";
import { GetRestaurantUseCaseImpl } from "./modules/restaurants/use-cases/get-restaurant/get-restaurant.use-case.impl";
import { UpdateRestaurantUseCaseImpl } from "./modules/restaurants/use-cases/update-restaurant/update-restaurant.use-case.impl";
import { PrismaDiningTableRepository } from "./modules/tables/repositories/prisma-dining-table.repository";
import { createDiningTableRouter } from "./modules/tables/router";
import { CreateTableUseCaseImpl } from "./modules/tables/use-cases/create-table/create-table.use-case.impl";
import { GetTableUseCaseImpl } from "./modules/tables/use-cases/get-table/get-table.use-case.impl";
import { ListTablesUseCaseImpl } from "./modules/tables/use-cases/list-tables/list-tables.use-case.impl";
import { UpdateTableUseCaseImpl } from "./modules/tables/use-cases/update-table/update-table.use-case.impl";
import { UpdateTableStatusUseCaseImpl } from "./modules/tables/use-cases/update-table-status/update-table-status.use-case.impl";
import { PrismaUserRepository } from "./modules/users/repositories/prisma-user.repository";
import { createUserRouter } from "./modules/users/router";
import { CreateUserUseCaseImpl } from "./modules/users/use-cases/create-user/create-user.use-case.impl";
import { GetUserUseCaseImpl } from "./modules/users/use-cases/get-user/get-user.use-case.impl";
import { ListUsersUseCaseImpl } from "./modules/users/use-cases/list-users/list-users.use-case.impl";
import { ResetUserPasswordUseCaseImpl } from "./modules/users/use-cases/reset-user-password/reset-user-password.use-case.impl";
import { UpdateUserUseCaseImpl } from "./modules/users/use-cases/update-user/update-user.use-case.impl";
import { UpdateUserStatusUseCaseImpl } from "./modules/users/use-cases/update-user-status/update-user-status.use-case.impl";
import { env } from "./shared/config/env";
import { NodemailerEmailService } from "./shared/email/nodemailer-email.service";
import { errorHandler } from "./shared/errors/error-handler";
import { BunPasswordService } from "./shared/security/bun-password.service";
import { JwtTokenService } from "./shared/security/jwt-token.service";

const app = new Hono();

const corsOrigins = env.CORS_ORIGINS.split(",")
	.map((origin) => origin.trim())
	.filter(Boolean);

app.use(
	"*",
	cors({
		origin: corsOrigins,
		allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization", "Idempotency-Key"],
		maxAge: 600,
		credentials: true,
	}),
);

app.onError(errorHandler);

// 404 global con el formato de error del contrato
app.notFound((c) => {
	return c.json(
		{
			error: {
				code: "ROUTE_NOT_FOUND",
				message: "La ruta solicitada no existe",
				details: [],
			},
		},
		404,
	);
});

// --- Servicios compartidos ---
const passwordService = new BunPasswordService();
const tokenService = new JwtTokenService();
const checkoutTokenService = new HmacCheckoutTokenService(env);
const customerMagicLinkService = new CryptoCustomerMagicLinkService();
const customerTokenService = new JwtCustomerTokenService(env);
const confirmationEmailService =
	new TemplateReservationConfirmationEmailService();
const customerAccessEmailService = new TemplateCustomerAccessEmailService();
const emailService = new NodemailerEmailService(env);

// --- Repositorios ---
const restaurantRepository = new PrismaRestaurantRepository();
const branchRepository = new PrismaBranchRepository();
const diningTableRepository = new PrismaDiningTableRepository();
const menuCategoryRepository = new PrismaMenuCategoryRepository();
const dishRepository = new PrismaDishRepository();
const branchDishRepository = new PrismaBranchDishRepository();
const reservationRepository = new PrismaReservationRepository();
const paymentRepository = new PrismaPaymentRepository();
const customerRepository = new PrismaCustomerRepository();
const userRepository = new PrismaUserRepository();
const authRepository = new PrismaAuthRepository();

// --- Funciones de existencia ---
const restaurantExists = async (id: string): Promise<boolean> => {
	const restaurant = await restaurantRepository.findById(id);
	return restaurant !== null;
};

const branchExists = async (id: string): Promise<boolean> => {
	const branch = await branchRepository.findById(id);
	return branch !== null;
};

const branchBelongsToRestaurant = async (
	branchId: string,
	restaurantId: string,
): Promise<boolean> => {
	const branch = await branchRepository.findById(branchId);
	return branch !== null && branch.restaurantId === restaurantId;
};

// --- Casos de uso: Restaurantes ---
const createRestaurant = new CreateRestaurantUseCaseImpl(restaurantRepository);
const getRestaurant = new GetRestaurantUseCaseImpl(restaurantRepository);
const getPublicRestaurant = new GetPublicRestaurantUseCaseImpl(
	restaurantRepository,
);
const updateRestaurant = new UpdateRestaurantUseCaseImpl(restaurantRepository);

// --- Casos de uso: Sucursales ---
const createBranch = new CreateBranchUseCaseImpl(
	branchRepository,
	restaurantExists,
);
const listBranches = new ListBranchesUseCaseImpl(
	branchRepository,
	restaurantExists,
);
const listPublicBranches = new ListPublicBranchesUseCaseImpl(
	restaurantRepository,
	branchRepository,
);
const getBranch = new GetBranchUseCaseImpl(branchRepository);
const updateBranch = new UpdateBranchUseCaseImpl(branchRepository);
const replaceSchedule = new ReplaceBranchScheduleUseCaseImpl(branchRepository);
const updateStatus = new UpdateBranchStatusUseCaseImpl(branchRepository);

// --- Casos de uso: Usuarios ---
const createUser = new CreateUserUseCaseImpl(
	userRepository,
	passwordService,
	branchExists,
);
const listUsers = new ListUsersUseCaseImpl(userRepository);
const getUser = new GetUserUseCaseImpl(userRepository);
const updateUser = new UpdateUserUseCaseImpl(userRepository, branchExists);
const updateUserStatus = new UpdateUserStatusUseCaseImpl(userRepository);
const resetUserPassword = new ResetUserPasswordUseCaseImpl(
	userRepository,
	passwordService,
);

// --- Casos de uso: Mesas ---
const createTable = new CreateTableUseCaseImpl(
	diningTableRepository,
	branchBelongsToRestaurant,
);
const listTables = new ListTablesUseCaseImpl(
	diningTableRepository,
	branchBelongsToRestaurant,
);
const getTable = new GetTableUseCaseImpl(
	diningTableRepository,
	branchBelongsToRestaurant,
);
const updateTable = new UpdateTableUseCaseImpl(
	diningTableRepository,
	branchBelongsToRestaurant,
);
const updateTableStatus = new UpdateTableStatusUseCaseImpl(
	diningTableRepository,
	branchBelongsToRestaurant,
);

// --- Casos de uso: Catálogo - Categorías ---
const createCategory = new CreateCategoryUseCaseImpl(
	menuCategoryRepository,
	restaurantExists,
);
const listCategories = new ListCategoriesUseCaseImpl(
	menuCategoryRepository,
	restaurantExists,
);
const getCategory = new GetCategoryUseCaseImpl(
	menuCategoryRepository,
	restaurantExists,
);
const updateCategory = new UpdateCategoryUseCaseImpl(
	menuCategoryRepository,
	restaurantExists,
);
const updateCategoryStatus = new UpdateCategoryStatusUseCaseImpl(
	menuCategoryRepository,
	restaurantExists,
);

// --- Casos de uso: Catálogo - Platos ---
const createDish = new CreateDishUseCaseImpl(
	dishRepository,
	menuCategoryRepository,
	restaurantExists,
);
const listDishes = new ListDishesUseCaseImpl(dishRepository, restaurantExists);
const getDish = new GetDishUseCaseImpl(dishRepository, restaurantExists);
const updateDish = new UpdateDishUseCaseImpl(
	dishRepository,
	menuCategoryRepository,
	restaurantExists,
);
const updateDishStatus = new UpdateDishStatusUseCaseImpl(
	dishRepository,
	restaurantExists,
);

// --- Casos de uso: Catálogo - Configuración por sucursal ---
const listBranchDishes = new ListBranchDishesUseCaseImpl(
	dishRepository,
	branchDishRepository,
	branchBelongsToRestaurant,
);
const upsertBranchDish = new UpsertBranchDishUseCaseImpl(
	branchDishRepository,
	dishRepository,
	branchBelongsToRestaurant,
);

// --- Casos de uso: Catálogo - Menú público ---
const getPublicMenu = new GetPublicMenuUseCaseImpl(
	dishRepository,
	branchDishRepository,
	restaurantRepository,
	branchRepository,
);

// --- Casos de uso: Reservas temporales ---
const getAvailability = new GetAvailabilityUseCaseImpl(reservationRepository);
const createTemporaryReservation = new CreateTemporaryReservationUseCaseImpl(
	reservationRepository,
	checkoutTokenService,
);

// --- Servicios de pago ---
const paymentGateway = new StripePaymentGatewayService(env);

// --- Casos de uso: Pagos ---
const createCheckout = new CreateCheckoutUseCaseImpl(
	paymentRepository,
	paymentGateway,
);
const getPaymentStatus = new GetPaymentStatusUseCaseImpl(paymentRepository);
const processStripeWebhook = new ProcessStripeWebhookUseCaseImpl(
	paymentRepository,
	paymentGateway,
	customerRepository,
	customerMagicLinkService,
	confirmationEmailService,
	emailService,
	env.CUSTOMER_MAGIC_LINK_URL,
);

// --- Casos de uso: Autenticación ---
const login = new LoginUseCaseImpl(
	authRepository,
	passwordService,
	tokenService,
);
const refreshSession = new RefreshSessionUseCaseImpl(
	authRepository,
	tokenService,
);
const logout = new LogoutUseCaseImpl(authRepository, tokenService);
const changePassword = new ChangePasswordUseCaseImpl(
	authRepository,
	passwordService,
);

// --- Casos de uso: Autenticación de clientes ---
const requestCustomerMagicLink = new RequestCustomerMagicLinkUseCaseImpl(
	customerRepository,
	customerMagicLinkService,
	customerAccessEmailService,
	emailService,
	env.CUSTOMER_MAGIC_LINK_URL,
);
const exchangeCustomerMagicLink = new ExchangeCustomerMagicLinkUseCaseImpl(
	customerRepository,
	customerTokenService,
);
const refreshCustomerSession = new RefreshCustomerSessionUseCaseImpl(
	customerRepository,
	customerTokenService,
);
const logoutCustomerSession = new LogoutCustomerSessionUseCaseImpl(
	customerRepository,
	customerTokenService,
);
const getCurrentCustomer = new GetCurrentCustomerUseCaseImpl(
	customerRepository,
);

// --- Rutas ---
app.route(
	"/auth",
	createAuthRouter({
		loginUseCase: login,
		refreshSessionUseCase: refreshSession,
		logoutUseCase: logout,
		changePasswordUseCase: changePassword,
		tokenService,
		authRepository,
	}),
);

app.route(
	"/users",
	createUserRouter({
		createUser,
		listUsers,
		getUser,
		updateUser,
		updateUserStatus,
		resetUserPassword,
		tokenService,
		authRepository,
	}),
);

app.route(
	"/restaurants",
	createRestaurantRouter({
		createRestaurant,
		getRestaurant,
		updateRestaurant,
		tokenService,
		authRepository,
	}),
);

app.route(
	"/restaurants/:restaurantId/branches",
	createBranchRouter({
		createBranch,
		listBranches,
		getBranch,
		updateBranch,
		replaceSchedule,
		updateStatus,
		tokenService,
		authRepository,
	}),
);

app.route(
	"/restaurants/:restaurantId/branches/:branchId/tables",
	createDiningTableRouter({
		createTable,
		listTables,
		getTable,
		updateTable,
		updateTableStatus,
		tokenService,
		authRepository,
	}),
);

// --- Rutas: Catálogo ---
app.route(
	"/restaurants/:restaurantId/menu/categories",
	createCategoryRouter({
		createCategory,
		listCategories,
		getCategory,
		updateCategory,
		updateCategoryStatus,
		tokenService,
		authRepository,
	}),
);

app.route(
	"/restaurants/:restaurantId/menu/dishes",
	createDishRouter({
		createDish,
		listDishes,
		getDish,
		updateDish,
		updateDishStatus,
		tokenService,
		authRepository,
	}),
);

app.route(
	"/restaurants/:restaurantId/branches/:branchId/dishes",
	createBranchDishRouter({
		listBranchDishes,
		upsertBranchDish,
		tokenService,
		authRepository,
	}),
);

app.route(
	"/public/restaurants/:restaurantSlug",
	createPublicRestaurantRouter({ getPublicRestaurant }),
);

app.route(
	"/public/restaurants/:restaurantSlug/branches",
	createPublicBranchRouter({ listPublicBranches }),
);

app.route(
	"/public/restaurants/:restaurantSlug/branches/:branchSlug/menu",
	createPublicMenuRouter({
		getPublicMenu,
	}),
);

app.route(
	"/public/restaurants/:restaurantSlug/branches/:branchSlug/reservations",
	createReservationRouter({
		getAvailability,
		createTemporaryReservation,
	}),
);

app.route(
	"/",
	createCustomerAuthRouter({
		requestCustomerMagicLinkUseCase: requestCustomerMagicLink,
		exchangeCustomerMagicLinkUseCase: exchangeCustomerMagicLink,
		refreshCustomerSessionUseCase: refreshCustomerSession,
		logoutCustomerSessionUseCase: logoutCustomerSession,
		getCurrentCustomerUseCase: getCurrentCustomer,
		customerTokenService,
		customerRepository,
	}),
);

// --- Rutas: Pagos públicos ---
app.route(
	"/public/restaurants/:restaurantSlug/branches/:branchSlug",
	createPaymentRouter({
		createCheckout,
		getPaymentStatus,
	}),
);

app.route(
	"/webhooks/stripe",
	createStripeWebhookRouter({
		processStripeWebhook,
	}),
);

app.get("/", (c) => {
	return c.text("Hello Hono!");
});

export default app;
