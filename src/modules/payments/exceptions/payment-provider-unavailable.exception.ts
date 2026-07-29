import { DomainException } from "../../../shared/errors/domain.exception";

export class PaymentProviderUnavailableException extends DomainException {
	constructor() {
		super(
			"PAYMENT_PROVIDER_UNAVAILABLE",
			"El proveedor de pagos no está disponible en este momento",
			503,
		);
		this.name = "PaymentProviderUnavailableException";
	}
}
