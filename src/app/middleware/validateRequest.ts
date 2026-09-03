import type { NextFunction, Request, Response } from "express";
import type z from "zod";
import { catchAsync } from "../utils/catchAsync";

export const validateRequest = (zodSchema: z.ZodObject) => {
	return catchAsync((req: Request, res: Response, next: NextFunction) => {
		const payLoad = req.body ?? {};

		const result = zodSchema.safeParse(payLoad);

		if (!result.success) {
			throw new Error(result.error.issues[0].message);
		}

		//? assigning the body again
		req.body = result.data;
		next();
	});
};
