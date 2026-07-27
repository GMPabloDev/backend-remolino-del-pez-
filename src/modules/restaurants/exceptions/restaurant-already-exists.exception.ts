import { DomainException } from "../../../shared/errors/domain.exception";

export class RestaurantAlreadyExistsException extends DomainException {
	constructor() {
		super(
			"RESTAURANT_ALREADY_EXISTS",
			"Ya existe un restaurante registrado",
			409,
		);
		this.name = "RestaurantAlreadyExistsException";
	}
}
