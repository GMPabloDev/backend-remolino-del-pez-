import { DomainException } from "../../../shared/errors/domain.exception";

export class DishNotFoundException extends DomainException {
	constructor() {
		super("DISH_NOT_FOUND", "El plato no existe", 404);
		this.name = "DishNotFoundException";
	}
}
