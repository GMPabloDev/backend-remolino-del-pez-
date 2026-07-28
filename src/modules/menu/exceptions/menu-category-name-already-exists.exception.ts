import { DomainException } from "../../../shared/errors/domain.exception";

export class MenuCategoryNameAlreadyExistsException extends DomainException {
	constructor() {
		super(
			"MENU_CATEGORY_NAME_ALREADY_EXISTS",
			"El nombre de la categoría ya existe en este restaurante",
			409,
		);
		this.name = "MenuCategoryNameAlreadyExistsException";
	}
}
