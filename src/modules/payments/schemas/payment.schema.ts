import { z } from "zod";
import { publicBranchSlugParamsSchema } from "../../../shared/slug/public-slug.schema";

/** UUID de ruta — validado por el router, pero el schema sirve de contrato. */
export const uuidParamSchema = z.string().uuid();

/** Bearer token presente y no vacío. */
export const bearerTokenSchema = z
	.string()
	.min(1, "El token de checkout es obligatorio")
	.transform((value) => {
		if (!value.startsWith("Bearer ")) {
			return value;
		}
		return value.slice(7);
	});

/** Parámetros de ruta para checkout y consulta de pago. */
export const paymentRouteParamsSchema = z.object({
	...publicBranchSlugParamsSchema.shape,
	reservationId: uuidParamSchema,
});
