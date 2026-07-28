import { DomainException } from "../../../shared/errors/domain.exception";

export class TableNotFoundException extends DomainException {
	constructor() {
		super("TABLE_NOT_FOUND", "La mesa no existe", 404);
		this.name = "TableNotFoundException";
	}
}
