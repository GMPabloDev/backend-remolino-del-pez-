import type { CustomerMagicLink } from "../../../generated/prisma/client";
import { prisma } from "../../../shared/database/prisma-client";
import { isValidUuid } from "../../../shared/guards/uuid.guard";
import type {
	CreateMagicLinkData,
	CustomerMagicLinkWithCustomer,
	CustomerRepository,
} from "./customer.repository";

const CUSTOMER_INCLUDE = {
	restaurant: {
		select: { name: true, slug: true },
	},
} as const;

const MAGIC_LINK_WITH_CUSTOMER_INCLUDE = {
	customer: {
		include: CUSTOMER_INCLUDE,
	},
} as const;

export class PrismaCustomerRepository implements CustomerRepository {
	async findById(id: string) {
		if (!isValidUuid(id)) return null;

		return prisma.customer.findUnique({
			where: { id },
			include: CUSTOMER_INCLUDE,
		});
	}

	async findByRestaurantSlugAndNormalizedEmail(
		restaurantSlug: string,
		normalizedEmail: string,
	) {
		if (!restaurantSlug || !normalizedEmail) return null;

		return prisma.customer.findFirst({
			where: {
				normalizedEmail,
				restaurant: { slug: restaurantSlug },
			},
			include: CUSTOMER_INCLUDE,
		});
	}

	async findMagicLinkByTokenHash(
		tokenHash: string,
	): Promise<CustomerMagicLinkWithCustomer | null> {
		if (!tokenHash) return null;

		return prisma.customerMagicLink.findUnique({
			where: { tokenHash },
			include: MAGIC_LINK_WITH_CUSTOMER_INCLUDE,
		});
	}

	async findLatestManualMagicLink(
		customerId: string,
	): Promise<CustomerMagicLink | null> {
		if (!isValidUuid(customerId)) return null;

		return prisma.customerMagicLink.findFirst({
			where: {
				customerId,
				source: "ACCESS_REQUEST",
			},
			orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		});
	}

	async createMagicLink(data: CreateMagicLinkData): Promise<CustomerMagicLink> {
		return prisma.customerMagicLink.create({
			data: {
				customerId: data.customerId,
				reservationId: data.reservationId ?? null,
				source: data.source,
				tokenHash: data.tokenHash,
				expiresAt: data.expiresAt,
			},
		});
	}

	async invalidateActiveMagicLinks(
		customerId: string,
		now: Date,
	): Promise<void> {
		await prisma.customerMagicLink.updateMany({
			where: {
				customerId,
				consumedAt: null,
				invalidatedAt: null,
				expiresAt: { gt: now },
			},
			data: { invalidatedAt: now },
		});
	}

	async markMagicLinkSent(
		magicLinkId: string,
		sentAt: Date,
	): Promise<CustomerMagicLink> {
		return prisma.customerMagicLink.update({
			where: { id: magicLinkId },
			data: {
				deliveryStatus: "SENT",
				sentAt,
				failedAt: null,
				lastErrorCode: null,
			},
		});
	}

	async markMagicLinkFailed(
		magicLinkId: string,
		failedAt: Date,
		errorCode: string,
	): Promise<CustomerMagicLink> {
		return prisma.customerMagicLink.update({
			where: { id: magicLinkId },
			data: {
				deliveryStatus: "FAILED",
				failedAt,
				lastErrorCode: errorCode,
			},
		});
	}

	async consumeMagicLink(
		magicLinkId: string,
		consumedAt: Date,
	): Promise<CustomerMagicLink | null> {
		if (!isValidUuid(magicLinkId)) return null;

		const result = await prisma.customerMagicLink.updateMany({
			where: {
				id: magicLinkId,
				consumedAt: null,
				invalidatedAt: null,
				expiresAt: { gt: consumedAt },
			},
			data: { consumedAt },
		});

		if (result.count === 0) return null;

		return prisma.customerMagicLink.findUnique({
			where: { id: magicLinkId },
		});
	}
}
