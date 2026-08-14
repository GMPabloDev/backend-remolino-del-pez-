import { DomainException } from "../../../shared/errors/domain.exception";

export class DocumentStorageUnavailableException extends DomainException {
	constructor() {
		super(
			"DOCUMENT_STORAGE_UNAVAILABLE",
			"El documento no está disponible temporalmente",
			503,
		);
		this.name = "DocumentStorageUnavailableException";
	}
}
