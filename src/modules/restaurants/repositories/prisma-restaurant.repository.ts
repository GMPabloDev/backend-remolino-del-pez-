import type { Restaurant } from "../../../generated/prisma/client";
import { prisma } from "../../../shared/database/prisma-client";
import {
	isSlugUniqueConstraintError,
	SlugConflictError,
} from "../../../shared/errors/slug-conflict.error";
import { isValidUuid } from "../../../shared/guards/uuid.guard";
import type {
	CreateRestaurantData,
	RestaurantRepository,
	UpdateRestaurantData,
} from "./restaurant.repository";

export class PrismaRestaurantRepository implements RestaurantRepository {
	async create(data: CreateRestaurantData): Promise<Restaurant> {
		try {
			return await prisma.restaurant.create({ data });
		} catch (error) {
			if (isSlugUniqueConstraintError(error, "Restaurant_slug_key")) {
				throw new SlugConflictError("restaurant", data.slug);
			}
			throw error;
		}
	}

	async findById(id: string): Promise<Restaurant | null> {
		if (!isValidUuid(id)) return null;
		return prisma.restaurant.findUnique({ where: { id } });
	}

	async findBySlug(slug: string): Promise<Restaurant | null> {
		return prisma.restaurant.findUnique({ where: { slug } });
	}

	async update(id: string, data: UpdateRestaurantData): Promise<Restaurant> {
		return prisma.restaurant.update({ where: { id }, data });
	}

	async count(): Promise<number> {
		return prisma.restaurant.count();
	}
}
