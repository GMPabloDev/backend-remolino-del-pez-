import { DomainException } from "../../../shared/errors/domain.exception";

export class InvalidMagicLinkException extends DomainException {
	constructor() {
		super("INVALID_MAGIC_LINK", "El enlace de acceso no es válido", 401);
		this.name = "InvalidMagicLinkException";
	}
}
