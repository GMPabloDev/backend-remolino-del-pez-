import { DomainException } from "../../../shared/errors/domain.exception";

export class PublicPaymentNotFoundException extends DomainException {
	constructor() {
		super(
			"PUBLIC_PAYMENT_NOT_FOUND",
			"Reserva no encontrada o token inválido",
			404,
		);
		this.name = "PublicPaymentNotFoundException";
	}
}
