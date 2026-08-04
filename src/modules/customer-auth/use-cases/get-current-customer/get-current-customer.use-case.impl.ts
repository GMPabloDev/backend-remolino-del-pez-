import { toCustomerDto } from "../../../customers/mapper/customer.mapper";
import type { CustomerRepository } from "../../../customers/repositories/customer.repository";
import { CustomerAuthRequiredException } from "../../exceptions/customer-auth-required.exception";
import type { GetCurrentCustomerUseCase } from "./get-current-customer.use-case";

export class GetCurrentCustomerUseCaseImpl
	implements GetCurrentCustomerUseCase
{
	constructor(private readonly customerRepository: CustomerRepository) {}

	async execute(customerId: string) {
		const customer = await this.customerRepository.findById(customerId);

		if (!customer) {
			throw new CustomerAuthRequiredException();
		}

		return toCustomerDto(customer);
	}
}
