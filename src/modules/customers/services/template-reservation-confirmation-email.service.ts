import type { EmailMessage } from "../../../shared/email/email.service";
import type {
	ReservationConfirmationEmailData,
	ReservationConfirmationEmailService,
} from "./reservation-confirmation-email.service";

export class TemplateReservationConfirmationEmailService
	implements ReservationConfirmationEmailService
{
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
			html: buildHtmlBody(data, dateTime, currency),
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
		`Gracias por tu reserva en ${data.restaurantName}.`,
		"Tu pago fue confirmado y tu reserva está confirmada.",
		"",
		"Detalle de la reserva:",
		`- Sucursal: ${data.branchName}`,
		`- Fecha: ${dateTime.date}`,
		`- Hora: ${dateTime.time}`,
		`- Personas: ${data.partySize}`,
		"- Platos:",
		items,
		`- Total: ${currency} ${data.total}`,
		`- Estado: confirmada`,
		"",
		"Accede a tu cuenta mediante este enlace:",
		data.accessUrl,
		"",
		"Te esperamos.",
	].join("\n");
}

function buildHtmlBody(
	data: ReservationConfirmationEmailData,
	dateTime: ReservationDateTime,
	currency: string,
): string {
	const items = data.items.length
		? data.items
				.map(
					(item) => `
						<tr>
							<td style="padding:8px 0;border-bottom:1px solid #e5e7eb;">${escapeHtml(item.name)}</td>
							<td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:center;">${item.quantity}</td>
							<td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:right;">${currency} ${escapeHtml(item.subtotal)}</td>
						</tr>`,
				)
				.join("")
		: `<tr><td colspan="3" style="padding:8px 0;">Sin platos adicionales</td></tr>`;

	return `<!doctype html>
<html lang="es">
	<body style="margin:0;background:#f3f4f6;font-family:Arial,sans-serif;color:#111827;">
		<div style="max-width:600px;margin:0 auto;padding:24px;">
			<div style="background:#ffffff;border-radius:12px;padding:32px;">
				<h1 style="margin-top:0;">Reserva confirmada</h1>
				<p>Hola ${escapeHtml(data.customerName)},</p>
				<p>Gracias por tu reserva en <strong>${escapeHtml(data.restaurantName)}</strong>.</p>
				<p>Tu pago fue confirmado y tu reserva está confirmada.</p>
				<h2>Detalle de la reserva</h2>
				<p>
					<strong>Sucursal:</strong> ${escapeHtml(data.branchName)}<br>
					<strong>Fecha:</strong> ${escapeHtml(dateTime.date)}<br>
					<strong>Hora:</strong> ${escapeHtml(dateTime.time)}<br>
					<strong>Personas:</strong> ${data.partySize}<br>
					<strong>Estado:</strong> Confirmada
				</p>
				<table style="width:100%;border-collapse:collapse;">
					<thead>
						<tr>
							<th style="padding:8px 0;text-align:left;">Plato</th>
							<th style="padding:8px 0;text-align:center;">Cantidad</th>
							<th style="padding:8px 0;text-align:right;">Subtotal</th>
						</tr>
					</thead>
					<tbody>${items}</tbody>
				</table>
				<p style="text-align:right;font-size:18px;"><strong>Total: ${currency} ${escapeHtml(data.total)}</strong></p>
				<p style="text-align:center;margin:32px 0;">
					<a href="${escapeHtml(data.accessUrl)}" style="display:inline-block;background:#111827;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;">Acceder a mi cuenta</a>
				</p>
				<p>Te esperamos.</p>
			</div>
		</div>
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
