import type { CustomerDto } from "../../../customers/dto/customer.dto";

export interface ExchangeCustomerMagicLinkResult {
	accessToken: string;
	refreshToken: string;
	customer: CustomerDto;
}

export interface ExchangeCustomerMagicLinkUseCase {
	execute(token: string): Promise<ExchangeCustomerMagicLinkResult>;
}
