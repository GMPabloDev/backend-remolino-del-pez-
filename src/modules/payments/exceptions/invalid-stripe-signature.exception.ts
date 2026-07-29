import { DomainException } from "../../../shared/errors/domain.exception";

export class InvalidStripeSignatureException extends DomainException {
	constructor() {
		super("INVALID_STRIPE_SIGNATURE", "Firma de webhook Stripe inválida", 400);
		this.name = "InvalidStripeSignatureException";
	}
}
