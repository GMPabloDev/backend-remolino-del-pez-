import { z } from "zod";

export const customerReceiptParamsSchema = z.object({
	reservationId: z.uuid(),
});
