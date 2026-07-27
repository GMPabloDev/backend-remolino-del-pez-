import { DomainException } from "../../../shared/errors/domain.exception";

export class BranchScheduleRequiredException extends DomainException {
  constructor() {
    super("BRANCH_SCHEDULE_REQUIRED", "La sucursal necesita al menos un horario para activarse", 422);
    this.name = "BranchScheduleRequiredException";
  }
}
