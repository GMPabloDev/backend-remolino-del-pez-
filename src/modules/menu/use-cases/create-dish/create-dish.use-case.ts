import type { DishDto } from "../../dto/dish.dto";
import type { CreateDishInput } from "../../schemas/create-dish.schema";

export interface CreateDishUseCase {
	execute(restaurantId: string, input: CreateDishInput): Promise<DishDto>;
}
