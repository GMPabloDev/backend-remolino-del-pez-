import { DomainException } from "../../../shared/errors/domain.exception";

export class PaymentStateConflictException extends DomainException {
	constructor() {
		super(
			"PAYMENT_STATE_CONFLICT",
			"El pago cambió de estado y la operación no puede repetirse de forma segura",
			409,
		);
		this.name = "PaymentStateConflictException";
	}
}
