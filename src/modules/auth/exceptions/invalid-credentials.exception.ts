import { DomainException } from "../../../shared/errors/domain.exception";

export class InvalidCredentialsException extends DomainException {
	constructor() {
		super("INVALID_CREDENTIALS", "Email o contraseña incorrectos", 401);
		this.name = "InvalidCredentialsException";
	}
}
