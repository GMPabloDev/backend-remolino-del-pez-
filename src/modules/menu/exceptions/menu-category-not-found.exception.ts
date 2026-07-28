import { DomainException } from "../../../shared/errors/domain.exception";

export class MenuCategoryNotFoundException extends DomainException {
	constructor() {
		super("MENU_CATEGORY_NOT_FOUND", "La categoría no existe", 404);
		this.name = "MenuCategoryNotFoundException";
	}
}
