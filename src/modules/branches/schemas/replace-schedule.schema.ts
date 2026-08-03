import { z } from "zod";
import { timeToMinutes } from "../../../shared/time/time";

const scheduleIntervalSchema = z
	.object({
		dayOfWeek: z.number().int().min(1).max(7),
		startTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
		endTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
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
