export interface RequestCustomerMagicLinkInput {
	restaurantSlug: string;
	email: string;
}

export interface RequestCustomerMagicLinkUseCase {
	execute(input: RequestCustomerMagicLinkInput): Promise<void>;
}
