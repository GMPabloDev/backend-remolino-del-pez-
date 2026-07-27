import { Hono } from "hono";
import { errorHandler } from "./shared/errors/error-handler";
import { PrismaRestaurantRepository } from "./modules/restaurants/repositories/prisma-restaurant.repository";
import { CreateRestaurantUseCaseImpl } from "./modules/restaurants/use-cases/create-restaurant/create-restaurant.use-case.impl";
import { GetRestaurantUseCaseImpl } from "./modules/restaurants/use-cases/get-restaurant/get-restaurant.use-case.impl";
import { UpdateRestaurantUseCaseImpl } from "./modules/restaurants/use-cases/update-restaurant/update-restaurant.use-case.impl";
import { createRestaurantRouter } from "./modules/restaurants/router";

const app = new Hono();

app.onError(errorHandler);

// --- Composition root: restaurantes ---
const restaurantRepository = new PrismaRestaurantRepository();
const createRestaurant = new CreateRestaurantUseCaseImpl(restaurantRepository);
const getRestaurant = new GetRestaurantUseCaseImpl(restaurantRepository);
const updateRestaurant = new UpdateRestaurantUseCaseImpl(restaurantRepository);

app.route("/restaurants", createRestaurantRouter({
  createRestaurant,
  getRestaurant,
  updateRestaurant,
}));

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

export default app;
