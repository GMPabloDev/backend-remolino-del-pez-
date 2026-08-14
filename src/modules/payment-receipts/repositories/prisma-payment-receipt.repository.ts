import type { PaymentReceipt } from "../../../generated/prisma/client";
import { prisma } from "../../../shared/database/prisma-client";
import { isValidUuid } from "../../../shared/guards/uuid.guard";
import type {
	PaymentReceiptPdfContext,
	PaymentReceiptRepository,
} from "./payment-receipt.repository";

const PDF_CONTEXT_INCLUDE = {
	reservation: {
		select: {
			startAt: true,
			endAt: true,
			partySize: true,
			items: true,
			branch: {
				select: {
					restaurant: { select: { timezone: true } },
				},
			},
		},
	},
} as const;

export class PrismaPaymentReceiptRepository
	implements PaymentReceiptRepository
{
	async findById(id: string): Promise<PaymentReceiptPdfContext | null> {
		if (!isValidUuid(id)) return null;

		const record = await prisma.paymentReceipt.findUnique({
			where: { id },
			include: PDF_CONTEXT_INCLUDE,
		});

		return record ? { receipt: record, reservation: record.reservation } : null;
	}

	async findByCustomerAndReservation(
		customerId: string,
		reservationId: string,
	): Promise<PaymentReceipt | null> {
		if (!isValidUuid(customerId) || !isValidUuid(reservationId)) return null;

		return prisma.paymentReceipt.findFirst({
			where: {
				reservationId,
				reservation: { customerId },
			},
		});
	}

	async markAvailable(
		id: string,
		data: {
			storagePublicId: string;
			storageVersion: string;
			storageBytes: number;
			generatedAt: Date;
		},
	): Promise<PaymentReceipt> {
		return prisma.paymentReceipt.update({
			where: { id },
			data: {
				status: "AVAILABLE",
				storagePublicId: data.storagePublicId,
				storageVersion: data.storageVersion,
				storageBytes: data.storageBytes,
				generatedAt: data.generatedAt,
				failedAt: null,
				lastErrorCode: null,
			},
		});
	}

	async markFailed(
		id: string,
		failedAt: Date,
		errorCode: string,
	): Promise<PaymentReceipt> {
		return prisma.paymentReceipt.update({
			where: { id },
			data: {
				status: "FAILED",
				failedAt,
				lastErrorCode: errorCode,
			},
		});
	}
}
