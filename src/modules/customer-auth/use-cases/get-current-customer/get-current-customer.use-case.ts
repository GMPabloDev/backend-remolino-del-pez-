import type { CustomerDto } from "../../../customers/dto/customer.dto";

export interface GetCurrentCustomerUseCase {
	execute(customerId: string): Promise<CustomerDto>;
}
