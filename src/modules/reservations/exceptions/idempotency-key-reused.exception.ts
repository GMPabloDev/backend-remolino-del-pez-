import { DomainException } from "../../../shared/errors/domain.exception";

export class IdempotencyKeyReusedException extends DomainException {
	constructor() {
		super(
			"IDEMPOTENCY_KEY_REUSED",
			"La clave de idempotencia ya fue utilizada con otra solicitud",
			409,
		);
		this.name = "IdempotencyKeyReusedException";
	}
}
