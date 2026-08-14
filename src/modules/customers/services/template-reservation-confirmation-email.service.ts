import type { EmailMessage } from "../../../shared/email/email.service";
import type {
	ReservationConfirmationEmailData,
	ReservationConfirmationEmailService,
} from "./reservation-confirmation-email.service";

const COLORS = {
	background: "#f4f7fb",
	panel: "#ffffff",
	ink: "#172033",
	muted: "#667085",
	line: "#e6eaf0",
	primary: "#0f766e",
	primaryDark: "#115e59",
	accent: "#f59e0b",
	softPrimary: "#ecfdf5",
} as const;

export class TemplateReservationConfirmationEmailService
	implements ReservationConfirmationEmailService
{
	constructor(private readonly logoUrl?: string) {}

	create(data: ReservationConfirmationEmailData): EmailMessage {
		const dateTime = formatReservationDateTime(
			data.startAt,
			data.endAt,
			data.timezone,
		);
		const currency = data.currency.toUpperCase();

		return {
			to: data.to,
			subject: `Reserva confirmada en ${data.restaurantName}`,
			text: buildTextBody(data, dateTime, currency),
			html: buildHtmlBody(data, dateTime, currency, this.logoUrl),
			attachments: data.attachment ? [data.attachment] : undefined,
		};
	}
}

function buildTextBody(
	data: ReservationConfirmationEmailData,
	dateTime: ReservationDateTime,
	currency: string,
): string {
	const items = data.items.length
		? data.items
				.map(
					(item) =>
						`- ${item.name} x${item.quantity}: ${currency} ${item.subtotal}`,
				)
				.join("\n")
		: "- Sin platos adicionales";

	return [
		`Hola ${data.customerName},`,
		"",
		`Tu reserva en ${data.restaurantName} está confirmada.`,
		"El pago fue procesado correctamente.",
		"",
		"Resumen de tu reserva:",
		`- Sucursal: ${data.branchName}`,
		`- Fecha: ${dateTime.date}`,
		`- Hora: ${dateTime.time}`,
		`- Personas: ${data.partySize}`,
		"- Platos:",
		items,
		`- Total pagado: ${currency} ${data.total}`,
		"",
		"Puedes revisar tus reservas desde tu cuenta:",
		data.accessUrl,
		...(data.attachment
			? ["", "Tu comprobante de pago está adjunto a este correo."]
			: []),
		"",
		"Te esperamos.",
	].join("\n");
}

function buildHtmlBody(
	data: ReservationConfirmationEmailData,
	dateTime: ReservationDateTime,
	currency: string,
	logoUrl?: string,
): string {
	const items = data.items.length
		? data.items
				.map(
					(item) => `
						<tr>
							<td style="padding:13px 0;border-bottom:1px solid ${COLORS.line};color:${COLORS.ink};font-size:14px;">${escapeHtml(item.name)}</td>
							<td style="padding:13px 0;border-bottom:1px solid ${COLORS.line};text-align:center;color:${COLORS.muted};font-size:14px;">${item.quantity}</td>
							<td style="padding:13px 0;border-bottom:1px solid ${COLORS.line};text-align:right;color:${COLORS.ink};font-size:14px;">${currency} ${escapeHtml(item.subtotal)}</td>
						</tr>`,
				)
				.join("")
		: `<tr><td colspan="3" style="padding:13px 0;color:${COLORS.muted};font-size:14px;">Sin platos adicionales</td></tr>`;

	const logo = logoUrl
		? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(data.restaurantName)}" width="64" height="64" style="display:block;width:64px;height:64px;object-fit:contain;border-radius:16px;background:#ffffff;padding:8px;box-sizing:border-box;">`
		: `<div style="width:64px;height:64px;border-radius:16px;background:${COLORS.accent};color:#ffffff;font-size:28px;font-weight:700;line-height:64px;text-align:center;">${escapeHtml(data.restaurantName.charAt(0).toUpperCase())}</div>`;

	return `<!doctype html>
<html lang="es">
	<body style="margin:0;background:${COLORS.background};font-family:Arial,Helvetica,sans-serif;color:${COLORS.ink};">
		<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${COLORS.background};padding:28px 12px;">
			<tr><td align="center">
				<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;background:${COLORS.panel};border-radius:20px;overflow:hidden;box-shadow:0 8px 30px rgba(15,23,42,.08);">
					<tr><td style="background:${COLORS.primaryDark};padding:28px 34px;">
						<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
							<td width="76" valign="top">${logo}</td>
							<td valign="middle" style="padding-left:16px;color:#ffffff;">
								<div style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#a7f3d0;font-weight:700;">${escapeHtml(data.restaurantName)}</div>
								<div style="font-size:27px;line-height:34px;font-weight:700;margin-top:5px;">Reserva confirmada</div>
							</td>
						</tr></table>
					</td></tr>
					<tr><td style="padding:34px 34px 10px;">
						<p style="margin:0 0 10px;font-size:17px;font-weight:700;color:${COLORS.ink};">Hola ${escapeHtml(data.customerName)},</p>
						<p style="margin:0;color:${COLORS.muted};font-size:15px;line-height:24px;">Tu reserva está lista. Hemos confirmado tu pago y guardado todos los detalles para tu visita.</p>
					</td></tr>
					<tr><td style="padding:20px 34px 8px;"><table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
						<td style="background:${COLORS.softPrimary};border-radius:14px;padding:17px 18px;width:50%;"><div style="font-size:11px;color:${COLORS.primary};font-weight:700;text-transform:uppercase;letter-spacing:.6px;">Fecha y hora</div><div style="font-size:15px;font-weight:700;color:${COLORS.ink};margin-top:6px;">${escapeHtml(dateTime.date)}</div><div style="font-size:13px;color:${COLORS.muted};margin-top:3px;">${escapeHtml(dateTime.time)}</div></td>
						<td width="12"></td>
						<td style="background:#fff7e6;border-radius:14px;padding:17px 18px;width:50%;"><div style="font-size:11px;color:#b45309;font-weight:700;text-transform:uppercase;letter-spacing:.6px;">Sucursal</div><div style="font-size:15px;font-weight:700;color:${COLORS.ink};margin-top:6px;">${escapeHtml(data.branchName)}</div><div style="font-size:13px;color:${COLORS.muted};margin-top:3px;">${data.partySize} personas</div></td>
					</tr></table></td></tr>
					<tr><td style="padding:20px 34px 10px;"><div style="font-size:18px;font-weight:700;color:${COLORS.ink};margin-bottom:10px;">Detalle de consumo</div><table role="presentation" cellpadding="0" cellspacing="0" width="100%"><thead><tr><th style="padding:9px 0;text-align:left;border-bottom:2px solid ${COLORS.line};font-size:11px;text-transform:uppercase;letter-spacing:.6px;color:${COLORS.muted};">Plato</th><th style="padding:9px 0;text-align:center;border-bottom:2px solid ${COLORS.line};font-size:11px;text-transform:uppercase;letter-spacing:.6px;color:${COLORS.muted};">Cant.</th><th style="padding:9px 0;text-align:right;border-bottom:2px solid ${COLORS.line};font-size:11px;text-transform:uppercase;letter-spacing:.6px;color:${COLORS.muted};">Subtotal</th></tr></thead><tbody>${items}</tbody></table></td></tr>
					<tr><td style="padding:8px 34px 10px;"><table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td style="font-size:14px;color:${COLORS.muted};">Total pagado</td><td align="right" style="font-size:23px;font-weight:700;color:${COLORS.primary};">${currency} ${escapeHtml(data.total)}</td></tr></table></td></tr>
					<tr><td style="padding:18px 34px 28px;text-align:center;"><a href="${escapeHtml(data.accessUrl)}" style="display:inline-block;background:${COLORS.primary};color:#ffffff;padding:14px 25px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">Ver mi cuenta</a>${data.attachment ? `<div style="margin-top:15px;color:${COLORS.muted};font-size:13px;">Tu comprobante de pago está adjunto a este correo.</div>` : ""}</td></tr>
					<tr><td style="background:#f8fafc;padding:20px 34px;text-align:center;color:${COLORS.muted};font-size:12px;line-height:19px;">${escapeHtml(data.restaurantName)} · ${escapeHtml(data.branchName)}<br>Te esperamos.</td></tr>
				</table>
			</td></tr>
		</table>
	</body>
</html>`;
}

interface ReservationDateTime {
	date: string;
	time: string;
}

function formatReservationDateTime(
	startAt: Date,
	endAt: Date,
	timezone: string,
): ReservationDateTime {
	const formatter = new Intl.DateTimeFormat("es-PE", {
		timeZone: timezone,
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
	});

	const start = formatter.formatToParts(startAt);
	const end = formatter.formatToParts(endAt);
	const startDate = start
		.filter((part) => ["weekday", "day", "month", "year"].includes(part.type))
		.map((part) => part.value)
		.join(" ")
		.replace(/\s+,/g, ",");
	const startTime = getDateTimePart(start, "hour", "minute");
	const endTime = getDateTimePart(end, "hour", "minute");

	return {
		date: startDate,
		time: `${startTime} - ${endTime}`,
	};
}

function getDateTimePart(
	parts: Intl.DateTimeFormatPart[],
	...types: Array<"hour" | "minute">
): string {
	return types
		.map((type) => parts.find((part) => part.type === type)?.value ?? "")
		.join(":");
}

function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}
