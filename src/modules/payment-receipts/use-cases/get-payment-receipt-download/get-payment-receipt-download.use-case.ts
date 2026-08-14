export interface PaymentReceiptDownloadDto {
	fileName: string;
	downloadUrl: string;
	expiresAt: string;
}

export interface GetPaymentReceiptDownloadUseCase {
	execute(
		customerId: string,
		reservationId: string,
	): Promise<PaymentReceiptDownloadDto>;
}
