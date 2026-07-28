import type { DishDto } from "../../dto/dish.dto";

export interface GetDishUseCase {
	execute(restaurantId: string, dishId: string): Promise<DishDto>;
}
