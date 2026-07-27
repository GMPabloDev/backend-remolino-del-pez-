import { DomainException } from "../../../shared/errors/domain.exception";

export class RestaurantNotFoundException extends DomainException {
  constructor() {
    super("RESTAURANT_NOT_FOUND", "El restaurante no existe", 404);
    this.name = "RestaurantNotFoundException";
  }
}
