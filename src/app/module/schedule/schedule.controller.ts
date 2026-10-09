import type { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";

const createSchedule = catchAsync(
	async (req: Request, res: Response, next: NextFunction) => {},
);

export const ScheduleController = {
	createSchedule,
};
