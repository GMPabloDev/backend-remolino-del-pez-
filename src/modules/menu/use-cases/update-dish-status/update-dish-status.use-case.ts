import type { DishDto } from "../../dto/dish.dto";
import type { UpdateDishStatusInput } from "../../schemas/update-dish-status.schema";

export interface UpdateDishStatusUseCase {
	execute(
		restaurantId: string,
		dishId: string,
		input: UpdateDishStatusInput,
	): Promise<DishDto>;
}
