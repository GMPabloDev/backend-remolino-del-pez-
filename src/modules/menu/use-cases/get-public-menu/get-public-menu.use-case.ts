import type { PublicMenuResponse } from "../../dto/public-menu.dto";

export interface GetPublicMenuUseCase {
	execute(
		restaurantSlug: string,
		branchSlug: string,
	): Promise<PublicMenuResponse>;
}
