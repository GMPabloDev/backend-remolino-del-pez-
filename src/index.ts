import { Hono } from "hono";
import { PrismaAuthRepository } from "./modules/auth/repositories/prisma-auth.repository";
import { createAuthRouter } from "./modules/auth/router";
import { ChangePasswordUseCaseImpl } from "./modules/auth/use-cases/change-password/change-password.use-case.impl";
import { LoginUseCaseImpl } from "./modules/auth/use-cases/login/login.use-case.impl";
import { LogoutUseCaseImpl } from "./modules/auth/use-cases/logout/logout.use-case.impl";
import { RefreshSessionUseCaseImpl } from "./modules/auth/use-cases/refresh-session/refresh-session.use-case.impl";
import { PrismaBranchRepository } from "./modules/branches/repositories/prisma-branch.repository";
import { createBranchRouter } from "./modules/branches/router";
import { PrismaDiningTableRepository } from "./modules/tables/repositories/prisma-dining-table.repository";
import { createDiningTableRouter } from "./modules/tables/router";
import { CreateTableUseCaseImpl } from "./modules/tables/use-cases/create-table/create-table.use-case.impl";
import { GetTableUseCaseImpl } from "./modules/tables/use-cases/get-table/get-table.use-case.impl";
import { ListTablesUseCaseImpl } from "./modules/tables/use-cases/list-tables/list-tables.use-case.impl";
import { UpdateTableUseCaseImpl } from "./modules/tables/use-cases/update-table/update-table.use-case.impl";
import { UpdateTableStatusUseCaseImpl } from "./modules/tables/use-cases/update-table-status/update-table-status.use-case.impl";
import { CreateBranchUseCaseImpl } from "./modules/branches/use-cases/create-branch/create-branch.use-case.impl";
import { GetBranchUseCaseImpl } from "./modules/branches/use-cases/get-branch/get-branch.use-case.impl";
import { ListBranchesUseCaseImpl } from "./modules/branches/use-cases/list-branches/list-branches.use-case.impl";
import { ReplaceBranchScheduleUseCaseImpl } from "./modules/branches/use-cases/replace-branch-schedule/replace-branch-schedule.use-case.impl";
import { UpdateBranchUseCaseImpl } from "./modules/branches/use-cases/update-branch/update-branch.use-case.impl";
import { UpdateBranchStatusUseCaseImpl } from "./modules/branches/use-cases/update-branch-status/update-branch-status.use-case.impl";
import { PrismaRestaurantRepository } from "./modules/restaurants/repositories/prisma-restaurant.repository";
import { createRestaurantRouter } from "./modules/restaurants/router";
import { CreateRestaurantUseCaseImpl } from "./modules/restaurants/use-cases/create-restaurant/create-restaurant.use-case.impl";
import { GetRestaurantUseCaseImpl } from "./modules/restaurants/use-cases/get-restaurant/get-restaurant.use-case.impl";
import { UpdateRestaurantUseCaseImpl } from "./modules/restaurants/use-cases/update-restaurant/update-restaurant.use-case.impl";
import { PrismaUserRepository } from "./modules/users/repositories/prisma-user.repository";
import { createUserRouter } from "./modules/users/router";
import { CreateUserUseCaseImpl } from "./modules/users/use-cases/create-user/create-user.use-case.impl";
import { GetUserUseCaseImpl } from "./modules/users/use-cases/get-user/get-user.use-case.impl";
import { ListUsersUseCaseImpl } from "./modules/users/use-cases/list-users/list-users.use-case.impl";
import { ResetUserPasswordUseCaseImpl } from "./modules/users/use-cases/reset-user-password/reset-user-password.use-case.impl";
import { UpdateUserUseCaseImpl } from "./modules/users/use-cases/update-user/update-user.use-case.impl";
import { UpdateUserStatusUseCaseImpl } from "./modules/users/use-cases/update-user-status/update-user-status.use-case.impl";
import { errorHandler } from "./shared/errors/error-handler";
import { BunPasswordService } from "./shared/security/bun-password.service";
import { JwtTokenService } from "./shared/security/jwt-token.service";

const app = new Hono();

app.onError(errorHandler);

// --- Servicios compartidos ---
const passwordService = new BunPasswordService();
const tokenService = new JwtTokenService();

// --- Repositorios ---
const restaurantRepository = new PrismaRestaurantRepository();
const branchRepository = new PrismaBranchRepository();
const diningTableRepository = new PrismaDiningTableRepository();
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

app.get("/", (c) => {
	return c.text("Hello Hono!");
});

export default app;
