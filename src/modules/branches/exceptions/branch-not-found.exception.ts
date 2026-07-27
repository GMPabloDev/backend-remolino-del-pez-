import { DomainException } from "../../../shared/errors/domain.exception";

export class BranchNotFoundException extends DomainException {
  constructor() {
    super("BRANCH_NOT_FOUND", "La sucursal no existe", 404);
    this.name = "BranchNotFoundException";
  }
}
