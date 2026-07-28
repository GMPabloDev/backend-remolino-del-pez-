import type { DishDto } from "../../dto/dish.dto";
import type { UpdateDishInput } from "../../schemas/update-dish.schema";

export interface UpdateDishUseCase {
	execute(
		restaurantId: string,
		dishId: string,
		input: UpdateDishInput,
	): Promise<DishDto>;
}
