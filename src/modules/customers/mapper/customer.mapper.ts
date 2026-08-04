import type { CustomerDto, CustomerWithRestaurant } from "../dto/customer.dto";

export function toCustomerDto(customer: CustomerWithRestaurant): CustomerDto {
	return {
		fullName: customer.fullName,
		email: customer.email,
		phone: customer.phone,
		restaurantSlug: customer.restaurant.slug,
	};
}
