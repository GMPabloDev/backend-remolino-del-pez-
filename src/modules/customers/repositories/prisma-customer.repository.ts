import { randomUUID } from "node:crypto";
import {
	type CustomerMagicLink,
	Prisma,
} from "../../../generated/prisma/client";
import { prisma } from "../../../shared/database/prisma-client";
import { isValidUuid } from "../../../shared/guards/uuid.guard";
import type {
	CreateMagicLinkData,
	CustomerMagicLinkWithCustomer,
	CustomerRepository,
	ExchangeMagicLinkData,
	ExchangeMagicLinkResult,
	RotateCustomerSessionData,
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

const SERIALIZABLE_RETRY_LIMIT = 3;

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

	async exchangeMagicLink(
		data: ExchangeMagicLinkData,
	): Promise<ExchangeMagicLinkResult | null> {
		if (!data.tokenHash) return null;

		for (let attempt = 1; attempt <= SERIALIZABLE_RETRY_LIMIT; attempt += 1) {
			try {
				return await prisma.$transaction(
					async (tx) => {
						const magicLink = await tx.customerMagicLink.findUnique({
							where: { tokenHash: data.tokenHash },
						});

						if (
							!magicLink ||
							magicLink.consumedAt ||
							magicLink.invalidatedAt ||
							magicLink.expiresAt <= data.consumedAt
						) {
							return null;
						}

						const consumed = await tx.customerMagicLink.updateMany({
							where: {
								id: magicLink.id,
								consumedAt: null,
								invalidatedAt: null,
								expiresAt: { gt: data.consumedAt },
							},
							data: { consumedAt: data.consumedAt },
						});

						if (consumed.count === 0) return null;

						await tx.customer.updateMany({
							where: {
								id: magicLink.customerId,
								emailVerifiedAt: null,
							},
							data: { emailVerifiedAt: data.consumedAt },
						});

						const customer = await tx.customer.findUnique({
							where: { id: magicLink.customerId },
							include: CUSTOMER_INCLUDE,
						});

						if (!customer) return null;

						const session = await tx.customerSession.create({
							data: {
								customerId: customer.id,
								refreshTokenHash: data.refreshTokenHash,
								expiresAt: data.refreshTokenExpiresAt,
							},
						});

						return { customer, session };
					},
					{
						isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
						maxWait: 5_000,
						timeout: 10_000,
					},
				);
			} catch (error) {
				if (!isSerializationConflict(error)) throw error;
				if (attempt === SERIALIZABLE_RETRY_LIMIT) throw error;
			}
		}

		throw new Error("No se pudo intercambiar el magic link");
	}

	async findSessionById(id: string) {
		if (!isValidUuid(id)) return null;

		return prisma.customerSession.findUnique({
			where: { id },
			include: { customer: { include: CUSTOMER_INCLUDE } },
		});
	}

	async findSessionByRefreshTokenHash(hash: string) {
		if (!hash) return null;

		return prisma.customerSession.findUnique({
			where: { refreshTokenHash: hash },
			include: { customer: { include: CUSTOMER_INCLUDE } },
		});
	}

	async rotateSession(data: RotateCustomerSessionData) {
		if (!isValidUuid(data.sessionId)) return null;

		for (let attempt = 1; attempt <= SERIALIZABLE_RETRY_LIMIT; attempt += 1) {
			try {
				return await prisma.$transaction(
					async (tx) => {
						const currentSession = await tx.customerSession.findUnique({
							where: { id: data.sessionId },
						});

						if (
							!currentSession ||
							currentSession.revokedAt ||
							currentSession.expiresAt <= data.now
						) {
							return null;
						}

						const newSessionId = randomUUID();
						const revoked = await tx.customerSession.updateMany({
							where: {
								id: data.sessionId,
								revokedAt: null,
								expiresAt: { gt: data.now },
							},
							data: {
								revokedAt: data.now,
								replacedBySessionId: newSessionId,
							},
						});

						if (revoked.count === 0) return null;

						const session = await tx.customerSession.create({
							data: {
								id: newSessionId,
								customerId: currentSession.customerId,
								refreshTokenHash: data.refreshTokenHash,
								expiresAt: data.expiresAt,
							},
						});

						const customer = await tx.customer.findUnique({
							where: { id: session.customerId },
							include: CUSTOMER_INCLUDE,
						});

						if (!customer) return null;

						return { customer, session };
					},
					{
						isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
						maxWait: 5_000,
						timeout: 10_000,
					},
				);
			} catch (error) {
				if (!isSerializationConflict(error)) throw error;
				if (attempt === SERIALIZABLE_RETRY_LIMIT) throw error;
			}
		}

		throw new Error("No se pudo rotar la sesión del cliente");
	}

	async revokeAllSessions(customerId: string): Promise<void> {
		if (!isValidUuid(customerId)) return;

		await prisma.customerSession.updateMany({
			where: { customerId, revokedAt: null },
			data: { revokedAt: new Date() },
		});
	}

	async revokeSessionByRefreshTokenHash(hash: string): Promise<void> {
		if (!hash) return;

		await prisma.customerSession.updateMany({
			where: { refreshTokenHash: hash, revokedAt: null },
			data: { revokedAt: new Date() },
		});
	}
}

function isSerializationConflict(error: unknown): boolean {
	return (
		(error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2034") ||
		hasAdapterCode(error, "40001")
	);
}

function hasAdapterCode(error: unknown, code: string): boolean {
	return (
		isRecord(error) &&
		isRecord(error.cause) &&
		error.cause.originalCode === code
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
