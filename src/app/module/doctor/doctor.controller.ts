import type { NextFunction, Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { DoctorServices } from "./doctor.service";
import { ApplyAsDoctorSchema } from "./doctor.validation";

const applyAsDoctor = catchAsync(
	async (req: Request, res: Response, next: NextFunction) => {
		const files = req.files as { [fieldname: string]: Express.Multer.File[] };

		const resume = files.resume ? files.resume[0] : null;
		const additionalFiles = files.additionalFiles;

		const data = ApplyAsDoctorSchema.safeParse(JSON.parse(req.body.data));

		if (!data.success) {
			throw new Error(data.error.issues[0].message);
		}

		const payLoad = data.data;

		const result = await DoctorServices.applyAsDoctor(
			payLoad,
			resume,
			additionalFiles,
		);

		return sendResponse(res, {
			success: true,
			statusCode: status.OK,
			message: "Application as Doctor Successfull",
			data: result,
		});
	},
);

const verifyDoctorEmail = catchAsync(
	async (req: Request, res: Response, next: NextFunction) => {
		const payLoad = req.body;

		const result = await DoctorServices.verifyDoctorEmail(payLoad);

		return sendResponse(res, {
			success: true,
			statusCode: status.OK,
			message: "Doctor Email Verification Successfull.",
			data: {},
		});
	},
);

export const DoctorController = {
	applyAsDoctor,
	verifyDoctorEmail,
};
