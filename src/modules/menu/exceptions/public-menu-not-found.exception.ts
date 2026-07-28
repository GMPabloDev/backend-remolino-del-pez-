import { DomainException } from "../../../shared/errors/domain.exception";

export class PublicMenuNotFoundException extends DomainException {
	constructor() {
		super(
			"PUBLIC_MENU_NOT_FOUND",
			"El menú público no está disponible para esta sucursal",
			404,
		);
		this.name = "PublicMenuNotFoundException";
	}
}
