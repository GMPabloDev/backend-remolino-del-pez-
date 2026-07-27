import type { Restaurant } from "../../../generated/prisma/client";
import { prisma } from "../../../shared/database/prisma-client";
import type {
  CreateRestaurantData,
  RestaurantRepository,
  UpdateRestaurantData,
} from "./restaurant.repository";

export class PrismaRestaurantRepository implements RestaurantRepository {
  async create(data: CreateRestaurantData): Promise<Restaurant> {
    return prisma.restaurant.create({ data });
  }

  async findById(id: string): Promise<Restaurant | null> {
    return prisma.restaurant.findUnique({ where: { id } });
  }

  async update(id: string, data: UpdateRestaurantData): Promise<Restaurant> {
    return prisma.restaurant.update({ where: { id }, data });
  }

  async count(): Promise<number> {
    return prisma.restaurant.count();
  }
}
