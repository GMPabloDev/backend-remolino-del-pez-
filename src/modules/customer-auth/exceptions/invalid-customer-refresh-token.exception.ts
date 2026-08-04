import { DomainException } from "../../../shared/errors/domain.exception";

export class InvalidCustomerRefreshTokenException extends DomainException {
	constructor() {
		super(
			"INVALID_CUSTOMER_REFRESH_TOKEN",
			"El token de actualización del cliente no es válido",
			401,
		);
		this.name = "InvalidCustomerRefreshTokenException";
	}
}
