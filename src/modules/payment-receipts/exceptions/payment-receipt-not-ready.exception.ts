import { DomainException } from "../../../shared/errors/domain.exception";

export class PaymentReceiptNotReadyException extends DomainException {
	constructor() {
		super(
			"PAYMENT_RECEIPT_NOT_READY",
			"El comprobante todavía no está disponible para descargar",
			409,
		);
		this.name = "PaymentReceiptNotReadyException";
	}
}
