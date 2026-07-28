import { DomainException } from "../../../shared/errors/domain.exception";

export class UserEmailAlreadyExistsException extends DomainException {
	constructor() {
		super("USER_EMAIL_ALREADY_EXISTS", "El email ya está registrado", 409);
		this.name = "UserEmailAlreadyExistsException";
	}
}
