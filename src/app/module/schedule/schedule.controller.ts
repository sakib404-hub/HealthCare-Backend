import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import type { RequestUser } from "../../middleware/checkAuth";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { ScheduleServices } from "./schedule.service";

const createSchedule = catchAsync(
	async (req: Request, res: Response, next: NextFunction) => {
		const payload = req.body;
		const user = req.user as RequestUser;

		const result = await ScheduleServices.createSchedule(payload, user);

		sendResponse(res, {
			statusCode: httpStatus.CREATED,
			success: true,
			message: "Schedule created successfully",
			data: result,
		});
	},
);

const getMySchedules = catchAsync(
	async (req: Request, res: Response, next: NextFunction) => {
		const query = req.query;
		const user = req.user as RequestUser;

		const result = await ScheduleServices.getMySchedules(query, user);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "My schedules retrieved successfully",
			data: result.data,
			meta: result.meta,
		});
	},
);

const getAllSchedules = catchAsync(
	async (req: Request, res: Response, next: NextFunction) => {
		const query = req.query;

		const result = await ScheduleServices.getAllSchedule(query);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "All schedules retrieved successfully",
			data: result.data,
			meta: result.meta,
		});
	},
);

const getTodaysSchedule = catchAsync(
	async (req: Request, res: Response, next: NextFunction) => {
		const query = req.query;

		const result = await ScheduleServices.getTodaysSchedule(query);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Today's schedules retrieved successfully",
			data: result.data,
			meta: result.meta,
		});
	},
);

const updateSchedule = catchAsync(
	async (req: Request, res: Response, next: NextFunction) => {
		const { scheduleId } = req.params;
		const payload = req.body;
		const user = req.user as RequestUser;

		const result = await ScheduleServices.updateSchedule(
			scheduleId as string,
			payload,
			user,
		);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Schedule updated successfully",
			data: result,
		});
	},
);

const publishSchedule = catchAsync(
	async (req: Request, res: Response, next: NextFunction) => {
		const { scheduleId } = req.params;
		const user = req.user as RequestUser;

		const result = await ScheduleServices.publishSchedule(
			scheduleId as string,
			user,
		);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Schedule published successfully",
			data: result,
		});
	},
);

const getScheduleById = catchAsync(
	async (req: Request, res: Response, next: NextFunction) => {
		const { scheduleId } = req.params;
		const user = req.user as RequestUser;

		const result = await ScheduleServices.getScheduleById(
			scheduleId as string,
			user,
		);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Schedule retrieved successfully",
			data: result,
		});
	},
);

const deleteScheduleById = catchAsync(
	async (req: Request, res: Response, next: NextFunction) => {
		const { scheduleId } = req.params;
		const user = req.user as RequestUser;

		const result = await ScheduleServices.deleteSchedule(
			scheduleId as string,
			user,
		);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Schedule deleted successfully",
			data: result,
		});
	},
);

export const ScheduleController = {
	createSchedule,
	getMySchedules,
	getAllSchedules,
	getTodaysSchedule,
	updateSchedule,
	publishSchedule,
	getScheduleById,
	deleteScheduleById,
};
