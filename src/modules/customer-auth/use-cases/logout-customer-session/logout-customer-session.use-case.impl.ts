import type { CustomerRepository } from "../../../customers/repositories/customer.repository";
import type { CustomerTokenService } from "../../services/customer-token.service";
import type { LogoutCustomerSessionUseCase } from "./logout-customer-session.use-case";

export class LogoutCustomerSessionUseCaseImpl
	implements LogoutCustomerSessionUseCase
{
	constructor(
		private readonly customerRepository: CustomerRepository,
		private readonly customerTokenService: CustomerTokenService,
	) {}

	async execute(refreshToken: string): Promise<void> {
		const refreshTokenHash = this.customerTokenService.hashToken(refreshToken);
		await this.customerRepository.revokeSessionByRefreshTokenHash(
			refreshTokenHash,
		);
	}
}
