import type { PublicMenuResponse } from "../../dto/public-menu.dto";

export interface GetPublicMenuUseCase {
	execute(restaurantId: string, branchId: string): Promise<PublicMenuResponse>;
}
