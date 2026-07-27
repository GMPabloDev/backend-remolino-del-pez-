import { z } from "zod";

/** Convierte "HH:mm" a minutos desde medianoche */
export function timeToMinutes(time: string): number {
	const [h, m] = time.split(":").map(Number);
	return h * 60 + m;
}

const scheduleIntervalSchema = z
	.object({
		dayOfWeek: z.number().int().min(1).max(7),
		startTime: z.string().regex(/^\d{2}:\d{2}$/),
		endTime: z.string().regex(/^\d{2}:\d{2}$/),
	})
	.refine(
		(data) => timeToMinutes(data.startTime) < timeToMinutes(data.endTime),
		{
			message: "La hora de inicio debe ser anterior a la de fin",
			path: ["startTime"],
		},
	);

export const replaceScheduleSchema = z.object({
	intervals: z.array(scheduleIntervalSchema),
});

export type ReplaceScheduleInput = z.infer<typeof replaceScheduleSchema>;
