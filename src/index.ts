import { Hono } from "hono";
import { errorHandler } from "./shared/errors/error-handler";
import { PrismaRestaurantRepository } from "./modules/restaurants/repositories/prisma-restaurant.repository";
import { PrismaBranchRepository } from "./modules/branches/repositories/prisma-branch.repository";
import { CreateRestaurantUseCaseImpl } from "./modules/restaurants/use-cases/create-restaurant/create-restaurant.use-case.impl";
import { GetRestaurantUseCaseImpl } from "./modules/restaurants/use-cases/get-restaurant/get-restaurant.use-case.impl";
import { UpdateRestaurantUseCaseImpl } from "./modules/restaurants/use-cases/update-restaurant/update-restaurant.use-case.impl";
import { CreateBranchUseCaseImpl } from "./modules/branches/use-cases/create-branch/create-branch.use-case.impl";
import { createRestaurantRouter } from "./modules/restaurants/router";
import { createBranchRouter } from "./modules/branches/router";

const app = new Hono();

app.onError(errorHandler);

// --- Composition root ---
const restaurantRepository = new PrismaRestaurantRepository();
const branchRepository = new PrismaBranchRepository();

const createRestaurant = new CreateRestaurantUseCaseImpl(restaurantRepository);
const getRestaurant = new GetRestaurantUseCaseImpl(restaurantRepository);
const updateRestaurant = new UpdateRestaurantUseCaseImpl(restaurantRepository);

// Helper para verificar existencia de restaurante desde el módulo de sucursales
const restaurantExists = async (id: string): Promise<boolean> => {
  const restaurant = await restaurantRepository.findById(id);
  return restaurant !== null;
};

const createBranch = new CreateBranchUseCaseImpl(branchRepository, restaurantExists);

// --- Rutas ---
app.route("/restaurants", createRestaurantRouter({
  createRestaurant,
  getRestaurant,
  updateRestaurant,
}));

app.route("/restaurants/:restaurantId/branches", createBranchRouter({
  createBranch,
}));

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

export default app;
