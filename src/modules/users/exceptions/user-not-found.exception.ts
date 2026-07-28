import { DomainException } from "../../../shared/errors/domain.exception";

export class UserNotFoundException extends DomainException {
	constructor() {
		super("USER_NOT_FOUND", "El usuario no existe", 404);
		this.name = "UserNotFoundException";
	}
}
