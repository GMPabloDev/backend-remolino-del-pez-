import { DomainException } from "../../../shared/errors/domain.exception";

export class CustomerAuthRequiredException extends DomainException {
	constructor() {
		super(
			"CUSTOMER_AUTH_REQUIRED",
			"Se requiere autenticación de cliente",
			401,
		);
		this.name = "CustomerAuthRequiredException";
	}
}
