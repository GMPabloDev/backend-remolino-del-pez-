export interface PaymentReceiptPdfItem {
	name: string;
	unitPrice: string;
	quantity: number;
	subtotal: string;
}

export interface PaymentReceiptPdfData {
	number: string;
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
