import type { DishStatus } from "../../../../generated/prisma/client";
import type { DishDto } from "../../dto/dish.dto";

export interface ListDishesUseCase {
	execute(restaurantId: string, status?: DishStatus): Promise<DishDto[]>;
}
