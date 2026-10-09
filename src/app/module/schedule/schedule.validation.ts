import { z } from "zod";

export const createScheduleZodSchema = z.object({
	startDateTime: z.coerce.date("Invalid start date time."),
	endDateTime: z.coerce.date("Invalid End Date Time"),
	meetLink: z.url("Invalid Meeting Link").trim(),
});

export const updateScheduleZodSchema = z.object({
	startDateTime: z.coerce.date("Invalid start date time.").optional(),
	endDateTime: z.coerce.date("Invalid End Date Time").optional(),
	meetLink: z.url("Invalid Meeting Link").trim().optional(),
});
