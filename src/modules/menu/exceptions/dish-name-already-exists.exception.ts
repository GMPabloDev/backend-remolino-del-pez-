import { DomainException } from "../../../shared/errors/domain.exception";

export class DishNameAlreadyExistsException extends DomainException {
	constructor() {
		super(
			"DISH_NAME_ALREADY_EXISTS",
			"El nombre del plato ya existe en este restaurante",
			409,
		);
		this.name = "DishNameAlreadyExistsException";
	}
}
