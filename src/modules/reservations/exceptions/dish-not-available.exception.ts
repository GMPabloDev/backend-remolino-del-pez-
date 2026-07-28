import { DomainException } from "../../../shared/errors/domain.exception";
import type { ErrorDetail } from "../../../shared/errors/error-response.types";

export class DishNotAvailableException extends DomainException {
	constructor(dishIds: string[]) {
		const details: ErrorDetail[] = dishIds.map((dishId) => ({
			field: "items",
			code: "DISH_NOT_AVAILABLE",
			message: `El plato ${dishId} no está disponible en la sucursal`,
		}));

		super(
			"DISH_NOT_AVAILABLE",
			"Uno o más platos no están disponibles en la sucursal",
			409,
			details,
		);
		this.name = "DishNotAvailableException";
	}
}
