import type { DocumentStorageService } from "../../../../shared/storage/document-storage.service";
import { CustomerReservationNotFoundException } from "../../exceptions/customer-reservation-not-found.exception";
import { DocumentStorageUnavailableException } from "../../exceptions/document-storage-unavailable.exception";
import { PaymentReceiptNotReadyException } from "../../exceptions/payment-receipt-not-ready.exception";
import type { PaymentReceiptRepository } from "../../repositories/payment-receipt.repository";
import type {
	GetPaymentReceiptDownloadUseCase,
	PaymentReceiptDownloadDto,
} from "./get-payment-receipt-download.use-case";

const DOWNLOAD_WINDOW_MS = 5 * 60 * 1000;

export class GetPaymentReceiptDownloadUseCaseImpl
	implements GetPaymentReceiptDownloadUseCase
{
	constructor(
		private readonly receiptRepository: PaymentReceiptRepository,
		private readonly storageService: DocumentStorageService,
	) {}

	async execute(
		customerId: string,
		reservationId: string,
	): Promise<PaymentReceiptDownloadDto> {
		const receipt = await this.receiptRepository.findByCustomerAndReservation(
			customerId,
			reservationId,
		);

		if (!receipt) throw new CustomerReservationNotFoundException();
		if (receipt.status !== "AVAILABLE" || !receipt.storagePublicId) {
			throw new PaymentReceiptNotReadyException();
		}

		const expiresAt = new Date(Date.now() + DOWNLOAD_WINDOW_MS);
		const fileName = `comprobante-${formatReceiptNumber(receipt.sequence)}.pdf`;
		let downloadUrl: string;

		try {
			downloadUrl = await this.storageService.createDownloadUrl(
				receipt.storagePublicId,
				fileName,
				expiresAt,
			);
		} catch {
			throw new DocumentStorageUnavailableException();
		}

		return { fileName, downloadUrl, expiresAt: expiresAt.toISOString() };
	}
}

function formatReceiptNumber(sequence: number): string {
	return `CP-${String(sequence).padStart(6, "0")}`;
}
