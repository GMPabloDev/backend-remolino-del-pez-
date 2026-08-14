export interface ProcessPaymentReceiptResult {
	number: string;
	fileName: string;
	content: Uint8Array | null;
}

export interface ProcessPaymentReceiptUseCase {
	execute(receiptId: string): Promise<ProcessPaymentReceiptResult | null>;
}
