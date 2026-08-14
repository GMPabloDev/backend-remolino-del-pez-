import { PDFDocument, type PDFFont, rgb, StandardFonts } from "pdf-lib";
import type {
	PaymentReceiptPdfData,
	PaymentReceiptPdfItem,
	PaymentReceiptPdfService,
} from "./payment-receipt-pdf.service";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 42;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const ROW_HEIGHT = 22;
const TABLE_HEADER_HEIGHT = 24;
const NAVY = rgb(0.04, 0.1, 0.2);
const GOLD = rgb(0.78, 0.56, 0.2);

export class PdfLibPaymentReceiptService implements PaymentReceiptPdfService {
	async generate(data: PaymentReceiptPdfData): Promise<Uint8Array> {
		const document = await PDFDocument.create();
		const regular = await document.embedFont(StandardFonts.Helvetica);
		const bold = await document.embedFont(StandardFonts.HelveticaBold);
		let page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
		let y = PAGE_HEIGHT - MARGIN;

		const addPage = () => {
			page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
			y = PAGE_HEIGHT - MARGIN;
			drawPageHeader(page, bold, data);
			y -= 62;
		};

		drawPageHeader(page, bold, data);
		y -= 72;
		drawSummary(page, regular, bold, data, y);
		y -= 174;
		drawSectionTitle(page, bold, "Detalle de la reserva", y);
		y -= 28;

		const drawTableHeader = () => {
			if (y < MARGIN + TABLE_HEADER_HEIGHT + ROW_HEIGHT) addPage();
			drawTableHeaderRow(page, bold, y);
			y -= TABLE_HEADER_HEIGHT;
		};

		drawTableHeader();
		for (const item of data.items) {
			if (y < MARGIN + ROW_HEIGHT) {
				addPage();
				drawTableHeader();
			}
			drawItemRow(page, regular, item, y);
			y -= ROW_HEIGHT;
		}

		if (y < MARGIN + 72) {
			addPage();
		}
		y -= 18;
		drawTotal(page, bold, data, y);
		y -= 52;
		page.drawText("Gracias por tu preferencia.", {
			x: MARGIN,
			y,
			font: regular,
			size: 10,
			color: rgb(0.35, 0.38, 0.42),
		});

		return document.save();
	}
}

function drawPageHeader(
	page: ReturnType<PDFDocument["addPage"]>,
	font: PDFFont,
	data: PaymentReceiptPdfData,
): void {
	const title =
		data.receiptType === "FACTURA" ? "FACTURA DE VENTA" : "BOLETA DE VENTA";
	page.drawText(title, {
		x: MARGIN,
		y: PAGE_HEIGHT - MARGIN,
		font,
		size: 18,
		color: NAVY,
	});
	page.drawText(data.number, {
		x: PAGE_WIDTH - MARGIN - font.widthOfTextAtSize(data.number, 11),
		y: PAGE_HEIGHT - MARGIN - 2,
		font,
		size: 11,
		color: rgb(0.2, 0.23, 0.28),
	});
	page.drawLine({
		start: { x: MARGIN, y: PAGE_HEIGHT - MARGIN - 14 },
		end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - MARGIN - 14 },
		thickness: 1.5,
		color: GOLD,
	});
	page.drawText(data.restaurantName, {
		x: MARGIN,
		y: PAGE_HEIGHT - MARGIN - 38,
		font,
		size: 13,
		color: rgb(0.12, 0.14, 0.18),
	});
	page.drawText(`${data.restaurantLegalName} · RUC ${data.restaurantTaxId}`, {
		x: MARGIN,
		y: PAGE_HEIGHT - MARGIN - 54,
		font: font,
		size: 9,
		color: rgb(0.35, 0.38, 0.42),
	});
}

function drawSummary(
	page: ReturnType<PDFDocument["addPage"]>,
	regular: PDFFont,
	bold: PDFFont,
	data: PaymentReceiptPdfData,
	y: number,
): void {
	const leftX = MARGIN;
	const rightX = MARGIN + CONTENT_WIDTH / 2 + 12;
	const reservationDate = formatDateTime(
		data.reservationStartAt,
		data.reservationEndAt,
		data.timezone,
	);
	const issuedAt = formatDate(data.issuedAt, data.timezone);

	drawLabelValue(page, regular, bold, "Sucursal", data.branchName, leftX, y);
	drawLabelValue(
		page,
		regular,
		bold,
		"Dirección",
		`${data.branchAddress}, ${data.branchDistrict}`,
		rightX,
		y,
	);
	drawLabelValue(
		page,
		regular,
		bold,
		"Ubicación",
		`${data.branchProvince}, ${data.branchDepartment}`,
		leftX,
		y - 26,
	);
	drawLabelValue(page, regular, bold, "Emisión", issuedAt, rightX, y - 26);
	drawLabelValue(
		page,
		regular,
		bold,
		"Cliente",
		data.customerName,
		leftX,
		y - 52,
	);
	drawLabelValue(
		page,
		regular,
		bold,
		"Correo",
		data.customerEmail,
		rightX,
		y - 52,
	);
	drawLabelValue(
		page,
		regular,
		bold,
		"Reserva",
		`${reservationDate.date} · ${reservationDate.time}`,
		leftX,
		y - 78,
	);
	drawLabelValue(
		page,
		regular,
		bold,
		"Personas",
		String(data.partySize),
		rightX,
		y - 78,
	);

	if (data.receiptType === "FACTURA") {
		drawLabelValue(
			page,
			regular,
			bold,
			"RUC",
			data.invoiceRuc ?? "-",
			leftX,
			y - 104,
		);
		drawLabelValue(
			page,
			regular,
			bold,
			"Razón social",
			data.invoiceBusinessName ?? "-",
			rightX,
			y - 104,
		);
		drawLabelValue(
			page,
			regular,
			bold,
			"Dirección fiscal",
			data.invoiceAddress ?? "-",
			leftX,
			y - 130,
		);
	} else {
		drawLabelValue(
			page,
			regular,
			bold,
			"DNI",
			data.documentNumber ?? "-",
			leftX,
			y - 104,
		);
	}
}

function drawLabelValue(
	page: ReturnType<PDFDocument["addPage"]>,
	regular: PDFFont,
	bold: PDFFont,
	label: string,
	value: string,
	x: number,
	y: number,
): void {
	page.drawText(`${label}:`, {
		x,
		y,
		font: bold,
		size: 9,
		color: rgb(0.2, 0.23, 0.28),
	});
	page.drawText(value, {
		x: x + 52,
		y,
		font: regular,
		size: 9,
		color: rgb(0.08, 0.1, 0.14),
		maxWidth: CONTENT_WIDTH / 2 - 58,
	});
}

function drawSectionTitle(
	page: ReturnType<PDFDocument["addPage"]>,
	font: PDFFont,
	title: string,
	y: number,
): void {
	page.drawText(title, {
		x: MARGIN,
		y,
		font,
		size: 12,
		color: rgb(0.08, 0.1, 0.14),
	});
}

function drawTableHeaderRow(
	page: ReturnType<PDFDocument["addPage"]>,
	font: PDFFont,
	y: number,
): void {
	page.drawRectangle({
		x: MARGIN,
		y: y - 6,
		width: CONTENT_WIDTH,
		height: TABLE_HEADER_HEIGHT,
		color: rgb(0.94, 0.95, 0.96),
	});
	page.drawText("Plato", { x: MARGIN + 8, y, font, size: 9 });
	page.drawText("Cant.", { x: MARGIN + 315, y, font, size: 9 });
	page.drawText("P. unit.", { x: MARGIN + 365, y, font, size: 9 });
	page.drawText("Subtotal", { x: MARGIN + 450, y, font, size: 9 });
}

function drawItemRow(
	page: ReturnType<PDFDocument["addPage"]>,
	font: PDFFont,
	item: PaymentReceiptPdfItem,
	y: number,
): void {
	page.drawText(truncate(item.name, 42), {
		x: MARGIN + 8,
		y,
		font,
		size: 9,
	});
	page.drawText(String(item.quantity), {
		x: MARGIN + 320,
		y,
		font,
		size: 9,
	});
	page.drawText(item.unitPrice, {
		x: MARGIN + 365,
		y,
		font,
		size: 9,
	});
	page.drawText(item.subtotal, {
		x: MARGIN + 450,
		y,
		font,
		size: 9,
	});
	page.drawLine({
		start: { x: MARGIN, y: y - 7 },
		end: { x: PAGE_WIDTH - MARGIN, y: y - 7 },
		thickness: 0.5,
		color: rgb(0.88, 0.89, 0.91),
	});
}

function drawTotal(
	page: ReturnType<PDFDocument["addPage"]>,
	font: PDFFont,
	data: PaymentReceiptPdfData,
	y: number,
): void {
	const text = `Total pagado: ${data.currency.toUpperCase()} ${data.total}`;
	page.drawText(text, {
		x: PAGE_WIDTH - MARGIN - font.widthOfTextAtSize(text, 13),
		y,
		font,
		size: 13,
		color: rgb(0.08, 0.1, 0.14),
	});
}

function formatDateTime(
	startAt: Date,
	endAt: Date,
	timezone: string,
): { date: string; time: string } {
	const start = dateTimeParts(startAt, timezone);
	const end = dateTimeParts(endAt, timezone);
	return {
		date: `${start.day}/${start.month}/${start.year}`,
		time: `${start.hour}:${start.minute} - ${end.hour}:${end.minute}`,
	};
}

function formatDate(value: Date, timezone: string): string {
	const parts = dateTimeParts(value, timezone);
	return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`;
}

function dateTimeParts(value: Date, timezone: string): Record<string, string> {
	return new Intl.DateTimeFormat("es-PE", {
		timeZone: timezone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
	})
		.formatToParts(value)
		.reduce<Record<string, string>>((result, part) => {
			if (part.type !== "literal") result[part.type] = part.value;
			return result;
		}, {});
}

function truncate(value: string, maxLength: number): string {
	return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}
