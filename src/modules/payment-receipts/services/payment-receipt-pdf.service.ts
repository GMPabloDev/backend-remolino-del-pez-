export interface PaymentReceiptPdfItem {
	name: string;
	unitPrice: string;
	quantity: number;
	subtotal: string;
}

export interface PaymentReceiptPdfData {
	number: string;
	receiptType: "BOLETA" | "FACTURA";
	restaurantName: string;
	restaurantLegalName: string;
	restaurantTaxId: string;
	branchName: string;
	branchAddress: string;
	branchDistrict: string;
	branchProvince: string;
	branchDepartment: string;
	customerName: string;
	customerEmail: string;
	customerPhone: string;
	documentNumber: string | null;
	invoiceRuc: string | null;
	invoiceBusinessName: string | null;
	invoiceAddress: string | null;
	issuedAt: Date;
	reservationStartAt: Date;
	reservationEndAt: Date;
	timezone: string;
	partySize: number;
	items: PaymentReceiptPdfItem[];
	currency: string;
	total: string;
}

export interface PaymentReceiptPdfService {
	generate(data: PaymentReceiptPdfData): Promise<Uint8Array>;
}
