import type { CustomerDto } from "../../../customers/dto/customer.dto";

export interface RefreshCustomerSessionResult {
	accessToken: string;
	refreshToken: string;
	customer: CustomerDto;
}

export interface RefreshCustomerSessionUseCase {
	execute(refreshToken: string): Promise<RefreshCustomerSessionResult>;
}
