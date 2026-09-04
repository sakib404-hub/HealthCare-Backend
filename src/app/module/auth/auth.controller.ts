import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import type { IRequestUser } from "./auth.interface";
import { AuthService } from "./auth.service";

const registerPatient = catchAsync(
	async (req: Request, res: Response, next: NextFunction) => {
		const payload = req.body;

	 await AuthService.registerPatient(payload);

		sendResponse(res, {
			statusCode: httpStatus.CREATED,
			success: true,
			message: "Verification Email sent.",
			data: null,
		});
	},
);

const loginUser = catchAsync(
	async (req: Request, res: Response, next: NextFunction) => {
		const payload = req.body;
		const result = await AuthService.loginUser(payload);
		const { accessToken, refreshToken } = result;

		res.cookie("accessToken", accessToken, {
			httpOnly: true,
			secure: false,
			sameSite: "none",
			maxAge: 1000 * 60 * 60 * 24, // 24 hour or 1 day
		});
		res.cookie("refreshToken", refreshToken, {
			httpOnly: true,
			secure: false,
			sameSite: "none",
			maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
		});

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "User logged in successfully",
			data: {
				accessToken,
				refreshToken,
			},
		});
	},
);

const getMe = catchAsync(
	async (req: Request, res: Response, next: NextFunction) => {
		const user = req.user as unknown as IRequestUser;

		if (!user) {
			throw new Error("User information is missing in the request");
		}

		const result = await AuthService.getMe(user);
		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "User profile fetched successfully",
			data: result,
		});
	},
);

const refreshToken = catchAsync(
	async (req: Request, res: Response, next: NextFunction) => {
		if (!req.cookies.refreshToken) {
			throw new Error("Refresh token is missing");
		}
		const result = await AuthService.refreshToken(req.cookies.refreshToken);
		const { accessToken, refreshToken: newRefreshToken } = result;

		res.cookie("accessToken", accessToken, {
			httpOnly: true,
			secure: false,
			sameSite: "none",
			maxAge: 1000 * 60 * 60 * 24, // 24 hour or 1 day
		});
		res.cookie("refreshToken", newRefreshToken, {
			httpOnly: true,
			secure: false,
			sameSite: "none",
			maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
		});

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "New tokens generated successfully",
			data: {
				accessToken,
				refreshToken: newRefreshToken,
			},
		});
	},
);

const googleLogin = catchAsync(
	async (req: Request, res: Response, next: NextFunction) => {
		const payLoad = req.body;

		const result = await AuthService.googleLogin(payLoad);

		const { accessToken, refreshToken } = result;

		res.cookie("accessToken", accessToken, {
			httpOnly: true,
			secure: false,
			sameSite: "none",
			maxAge: 1000 * 60 * 60 * 24, // 24 hour or 1 day
		});
		res.cookie("refreshToken", refreshToken, {
			httpOnly: true,
			secure: false,
			sameSite: "none",
			maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
		});

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "User logged in successfully",
			data: {
				accessToken,
				refreshToken,
			},
		});
	},
);

const forgotPassword = catchAsync(
	async (req: Request, res: Response, next: NextFunction) => {
		const payload = req.body;
		await AuthService.forgotPassword(payload);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: `Otp sended successfully to : ${payload.email}`,
			data: null,
		});
	},
);

const resetPassword = catchAsync(
	async (req: Request, res: Response, next: NextFunction) => {
		const payload = req.body;
		await AuthService.resetPassword(payload);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Password reset successfully",
			data: null,
		});
	},
);

const verifyEmail = catchAsync(async(req : Request, res : Response, next : NextFunction)=>{
	const payLoad = req.body;

	const {accessToken, refreshToken, user, patient} = await AuthService.verifyEmail(payLoad);

	res.cookie("accessToken", accessToken, {
			httpOnly: true,
			secure: false,
			sameSite: "none",
			maxAge: 1000 * 60 * 60 * 24, // 24 hour or 1 day
		});
		res.cookie("refreshToken", refreshToken, {
			httpOnly: true,
			secure: false,
			sameSite: "none",
			maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
		});
	return sendResponse(res, {
		statusCode : httpStatus.OK,
		success : true,
		message : "Email verified Successfully",
		data : {
			accessToken,
			refreshToken,
			user,
			patient
		}
	})
})

export const AuthController = {
	registerPatient,
	loginUser,
	getMe,
	refreshToken,
	googleLogin,
	forgotPassword,
	resetPassword,
	verifyEmail
};
