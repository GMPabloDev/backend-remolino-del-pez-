import { z } from "zod";
import { isValidCalendarDate } from "./get-availability.schema";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^\d{2}:\d{2}$/;
const E164_REGEX = /^\+\d{8,15}$/;

const dateSchema = z
	.string()
	.regex(DATE_REGEX, "La fecha debe tener el formato YYYY-MM-DD")
	.refine(isValidCalendarDate, "La fecha no es válida");

const timeSchema = z
	.string()
	.regex(TIME_REGEX, "La hora debe tener el formato HH:mm")
	.refine((value) => {
		const [hour, minute] = value.split(":").map(Number);
		return (
			hour >= 0 &&
			hour <= 23 &&
			minute >= 0 &&
			minute <= 59 &&
			minute % 15 === 0
		);
	}, "La hora debe usar minutos 00, 15, 30 o 45");

const customerSchema = z
	.object({
		fullName: z.string().trim().min(2).max(150),
		email: z
			.string()
			.trim()
			.max(320)
			.email()
			.transform((value) => value.toLowerCase()),
		phone: z
			.string()
			.trim()
			.regex(E164_REGEX, "El teléfono debe usar formato E.164"),
	})
	.strict();

const billingDocumentSchema = z.discriminatedUnion("type", [
	z
		.object({
			type: z.literal("BOLETA"),
			documentNumber: z
				.string()
				.trim()
				.regex(/^\d{8}$/, "El DNI debe tener 8 dígitos"),
		})
		.strict(),
	z
		.object({
			type: z.literal("FACTURA"),
			ruc: z
				.string()
				.trim()
				.regex(/^\d{11}$/, "El RUC debe tener 11 dígitos"),
			businessName: z.string().trim().min(2).max(200),
			fiscalAddress: z.string().trim().min(5).max(250),
		})
		.strict(),
]);

const itemsSchema = z
	.array(
		z
			.object({
				dishId: z.string().uuid(),
				quantity: z.number().int().min(1).max(99),
			})
			.strict(),
	)
	.min(1)
	.max(50)
	.superRefine((items, context) => {
		const seen = new Set<string>();

		for (const [index, item] of items.entries()) {
			if (seen.has(item.dishId)) {
				context.addIssue({
					code: "custom",
					path: [index, "dishId"],
					message: "El plato no puede repetirse",
				});
			}
			seen.add(item.dishId);
		}
	});

export const createTemporaryReservationHeadersSchema = z.object({
	"idempotency-key": z.uuid(),
});

export const createTemporaryReservationSchema = z
	.object({
		date: dateSchema,
		time: timeSchema,
		partySize: z.number().int().positive(),
		customer: customerSchema,
		billingDocument: billingDocumentSchema,
		items: itemsSchema,
	})
	.strict();

export type CreateTemporaryReservationHeaders = z.infer<
	typeof createTemporaryReservationHeadersSchema
>;
export type CreateTemporaryReservationInput = z.infer<
	typeof createTemporaryReservationSchema
>;
