import type { DocumentStorageService } from "../../../../shared/storage/document-storage.service";
import type { PaymentReceiptRepository } from "../../repositories/payment-receipt.repository";
import type {
	PaymentReceiptPdfData,
	PaymentReceiptPdfService,
} from "../../services/payment-receipt-pdf.service";
import type {
	ProcessPaymentReceiptResult,
	ProcessPaymentReceiptUseCase,
} from "./process-payment-receipt.use-case";

export class ProcessPaymentReceiptUseCaseImpl
	implements ProcessPaymentReceiptUseCase
{
	constructor(
		private readonly receiptRepository: PaymentReceiptRepository,
		private readonly pdfService: PaymentReceiptPdfService,
		private readonly storageService: DocumentStorageService,
	) {}

	async execute(
		receiptId: string,
	): Promise<ProcessPaymentReceiptResult | null> {
		const context = await this.receiptRepository.findById(receiptId);
		if (!context) return null;

		const number = formatReceiptNumber(
			context.receipt.sequence,
			context.receipt.receiptType,
		);
		const documentName =
			context.receipt.receiptType === "FACTURA" ? "factura" : "boleta";
		const fileName = `${documentName}-${number}.pdf`;
		let content: Uint8Array;

		try {
			const data: PaymentReceiptPdfData = {
				number,
				receiptType: context.receipt.receiptType,
				restaurantName: context.receipt.restaurantName,
				restaurantLegalName: context.receipt.restaurantLegalName,
				restaurantTaxId: context.receipt.restaurantTaxId,
				branchName: context.receipt.branchName,
				branchAddress: context.receipt.branchAddress,
				branchDistrict: context.receipt.branchDistrict,
				branchProvince: context.receipt.branchProvince,
				branchDepartment: context.receipt.branchDepartment,
				customerName: context.receipt.customerName,
				customerEmail: context.receipt.customerEmail,
				customerPhone: context.receipt.customerPhone,
				documentNumber: context.receipt.documentNumber,
				invoiceRuc: context.receipt.invoiceRuc,
				invoiceBusinessName: context.receipt.invoiceBusinessName,
				invoiceAddress: context.receipt.invoiceAddress,
				issuedAt: context.receipt.issuedAt,
				reservationStartAt: context.reservation.startAt,
				reservationEndAt: context.reservation.endAt,
				timezone: context.reservation.branch.restaurant.timezone,
				partySize: context.reservation.partySize,
				items: context.reservation.items.map((item) => ({
					name: item.dishName,
					unitPrice: item.unitPrice.toFixed(2),
					quantity: item.quantity,
					subtotal: item.subtotal.toFixed(2),
				})),
				currency: context.receipt.currency,
				total: context.receipt.total.toFixed(2),
			};
			content = await this.pdfService.generate(data);
		} catch {
			await this.markFailed(receiptId, "PDF_GENERATION_FAILED");
			return { number, fileName, content: null };
		}

		try {
			const stored = await this.storageService.uploadPdf(
				content,
				`payment-receipts/${documentName}-${number}`,
			);
			await this.receiptRepository.markAvailable(receiptId, {
				storagePublicId: stored.publicId,
				storageVersion: stored.version,
				storageBytes: stored.bytes,
				generatedAt: new Date(),
			});
		} catch {
			await this.markFailed(receiptId, "CLOUDINARY_UPLOAD_FAILED");
		}

		return { number, fileName, content };
	}

	private async markFailed(receiptId: string, code: string): Promise<void> {
		try {
			await this.receiptRepository.markFailed(receiptId, new Date(), code);
		} catch {
			// El fallo de persistencia no debe revertir el pago confirmado.
		}
	}
}

export function formatReceiptNumber(
	sequence: number,
	receiptType: "BOLETA" | "FACTURA" = "BOLETA",
): string {
	const prefix = receiptType === "FACTURA" ? "F001" : "B001";
	return `${prefix}-${String(sequence).padStart(6, "0")}`;
}
