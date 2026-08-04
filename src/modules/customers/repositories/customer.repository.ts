import type {
	CustomerMagicLink,
	CustomerMagicLinkSource,
	CustomerSession,
} from "../../../generated/prisma/client";
import type { CustomerWithRestaurant } from "../dto/customer.dto";

export interface CreateMagicLinkData {
	customerId: string;
	reservationId?: string | null;
	source: CustomerMagicLinkSource;
	tokenHash: string;
	expiresAt: Date;
}

export interface ExchangeMagicLinkData {
	tokenHash: string;
	consumedAt: Date;
	refreshTokenHash: string;
	refreshTokenExpiresAt: Date;
}

export interface ExchangeMagicLinkResult {
	customer: CustomerWithRestaurant;
	session: CustomerSession;
}

export interface RotateCustomerSessionData {
	sessionId: string;
	now: Date;
	refreshTokenHash: string;
	expiresAt: Date;
}

export interface CustomerRepository {
	findById(id: string): Promise<CustomerWithRestaurant | null>;
	findByRestaurantSlugAndNormalizedEmail(
		restaurantSlug: string,
		normalizedEmail: string,
	): Promise<CustomerWithRestaurant | null>;
	findMagicLinkByTokenHash(
		tokenHash: string,
	): Promise<CustomerMagicLinkWithCustomer | null>;
	findLatestManualMagicLink(
		customerId: string,
	): Promise<CustomerMagicLink | null>;
	createMagicLink(data: CreateMagicLinkData): Promise<CustomerMagicLink>;
	invalidateActiveMagicLinks(customerId: string, now: Date): Promise<void>;
	markMagicLinkSent(
		magicLinkId: string,
		sentAt: Date,
	): Promise<CustomerMagicLink>;
	markMagicLinkFailed(
		magicLinkId: string,
		failedAt: Date,
		errorCode: string,
	): Promise<CustomerMagicLink>;
	consumeMagicLink(
		magicLinkId: string,
		consumedAt: Date,
	): Promise<CustomerMagicLink | null>;
	exchangeMagicLink(
		data: ExchangeMagicLinkData,
	): Promise<ExchangeMagicLinkResult | null>;
	findSessionByRefreshTokenHash(
		hash: string,
	): Promise<CustomerSessionWithCustomer | null>;
	rotateSession(
		data: RotateCustomerSessionData,
	): Promise<RotateCustomerSessionResult | null>;
	revokeAllSessions(customerId: string): Promise<void>;
	revokeSessionByRefreshTokenHash(hash: string): Promise<void>;
}

export type CustomerMagicLinkWithCustomer = CustomerMagicLink & {
	customer: CustomerWithRestaurant;
};

export type CustomerSessionWithCustomer = CustomerSession & {
	customer: CustomerWithRestaurant;
};

export interface RotateCustomerSessionResult {
	customer: CustomerWithRestaurant;
	session: CustomerSession;
}
