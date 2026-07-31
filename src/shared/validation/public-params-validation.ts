import { sValidator } from "@hono/standard-validator";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { ErrorResponseBody } from "../errors/error-response.types";

export type PublicNotFoundCode =
	| "RESTAURANT_NOT_FOUND"
	| "PUBLIC_MENU_NOT_FOUND"
	| "PUBLIC_RESERVATION_NOT_FOUND"
	| "PUBLIC_PAYMENT_NOT_FOUND";

export function validatePublicParams<Schema extends StandardSchemaV1>(
	schema: Schema,
	code: PublicNotFoundCode,
) {
	return sValidator("param", schema, (result, c) => {
		if (result.success) return;

		const body: ErrorResponseBody = {
			error: {
				code,
				message: "El recurso público no existe",
				details: [],
			},
		};

		return c.json(body, 404);
	});
}
