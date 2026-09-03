import bcrypt from "bcryptjs";
import crypto from "crypto";
import ejs from "ejs";
import type { TokenPayload } from "google-auth-library";
import type { JwtPayload, SignOptions } from "jsonwebtoken";
import {
	AuthProvider,
	Role,
	UserStatus,
} from "../../../generated/prisma/enums";
import config from "../../config";
import { googleClient } from "../../lib/google";
import transporter from "../../lib/nodeMailer";
import { prisma } from "../../lib/prisma";
import redisClient from "../../lib/redis";
import { jwtUtils } from "../../utils/jwt";
import type {
	googlePayLoad,
	IForgotPasswordPayload,
	ILoginUserPayload,
	IRegisterPatientPayload,
	IRequestUser,
	IResetPasswordPayload,
} from "./auth.interface";
import path from "path";

const registerPatient = async (payload: IRegisterPatientPayload) => {
	const { name, password, patient: patientData } = payload;
	const email = payload.email.trim().toLowerCase();

	const isUserExists = await prisma.user.findUnique({
		where: { email },
	});

	if (isUserExists) {
		throw new Error("User with this email already exists");
	}

	const hashedPassword = await bcrypt.hash(password, 8);

	const createdUser = await prisma.user.create({
		data: {
			name,
			email,
			password: hashedPassword,
			role: Role.PATIENT,
			status: UserStatus.ACTIVE,
			emailVerified: false,
			patient: {
				create: {
					name,
					email,
					contactNumber: patientData?.contactNumber || "",
				},
			},
		},
		omit: { password: true },
		include: { patient: true },
	});

	const { patient, ...user } = createdUser;
	const jwtPayload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_access_secret,
		config.jwt_access_expires_in as SignOptions,
	);

	const refreshToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_refresh_secret,
		config.jwt_refresh_expires_in as SignOptions,
	);

	return {
		user,
		patient,
		accessToken,
		refreshToken,
	};
};

const loginUser = async (payload: ILoginUserPayload) => {
	const { password } = payload;
	const email = payload.email.trim().toLowerCase();

	const user = await prisma.user.findUnique({
		where: { email },
	});

	if (!user) {
		throw new Error("User not found");
	}

	if (user.status === UserStatus.BLOCKED) {
		throw new Error("User is blocked");
	}

	if (user.isDeleted || user.status === UserStatus.DELETED) {
		throw new Error("User is deleted");
	}

	if (user.password === null && user.googleId !== null) {
		throw new Error("User Already has account with google.");
	}

	const isPasswordMatched = await bcrypt.compare(
		password,
		user.password as string,
	);

	if (!isPasswordMatched) {
		throw new Error("Invalid credentials");
	}

	const jwtPayload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_access_secret,
		config.jwt_access_expires_in as SignOptions,
	);

	const refreshToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_refresh_secret,
		config.jwt_refresh_expires_in as SignOptions,
	);

	return {
		accessToken,
		refreshToken,
	};
};

const getMe = async (user: IRequestUser) => {
	const isUserExists = await prisma.user.findUnique({
		where: {
			id: user.userId,
		},
		include: {
			patient: true,
		},
		omit: {
			password: true,
		},
	});

	if (!isUserExists) {
		throw new Error("User not found");
	}

	return isUserExists;
};

const refreshToken = async (token: string) => {
	const verifiedRefreshToken = jwtUtils.verifyToken(
		token,
		config.jwt_refresh_secret,
	);

	if (!verifiedRefreshToken.success || !verifiedRefreshToken.data) {
		throw new Error(
			config.node_env === "development"
				? verifiedRefreshToken.error
				: "Invalid refresh token",
		);
	}

	const data = verifiedRefreshToken.data as JwtPayload;

	const user = await prisma.user.findUnique({
		where: { id: data.userId },
	});

	if (!user || user.isDeleted || user.status !== UserStatus.ACTIVE) {
		throw new Error("User is inactive or not found");
	}

	const jwtPayload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_access_secret,
		config.jwt_access_expires_in as SignOptions,
	);

	const refreshToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_refresh_secret,
		config.jwt_refresh_expires_in as SignOptions,
	);

	return {
		accessToken,
		refreshToken,
	};
};

const googleLogin = async (payload: googlePayLoad) => {
	let googleIdTokenPayload: TokenPayload | null | undefined = null;

	try {
		const ticket = await googleClient.verifyIdToken({
			idToken: payload.idToken,
			audience: config.google_client_id,
		});

		googleIdTokenPayload = ticket.getPayload();
	} catch (error) {
		console.log("Google Id verification failed.");
		throw new Error("Invalid or Expired Google Id Token.");
	}

	if (!googleIdTokenPayload) {
		throw new Error("Invalid or Expired Google Id Token.");
	}

	if (!googleIdTokenPayload.email) {
		throw new Error("Goggle Email not found.");
	}

	if (!googleIdTokenPayload.name) {
		throw new Error("Goggle Name not found.");
	}

	const isPatientExistWithGoogleAuth = await prisma.user.findUnique({
		where: {
			email: googleIdTokenPayload.email,
			role: Role.PATIENT,
			googleId: googleIdTokenPayload.sub,
		},
	});

	let user = isPatientExistWithGoogleAuth;

	if (!isPatientExistWithGoogleAuth) {
		const isPatientExistWithCredential = await prisma.user.findUnique({
			where: {
				email: googleIdTokenPayload.email,
				role: Role.PATIENT,
				authProvider: AuthProvider.CREDENTIAL,
			},
		});

		if (isPatientExistWithCredential) {
			if (isPatientExistWithCredential.status === UserStatus.BLOCKED) {
				throw new Error("User is Blocked.");
			}

			if (
				isPatientExistWithCredential.isDeleted ||
				isPatientExistWithCredential.status === UserStatus.DELETED
			) {
				throw new Error("User is Deleted.");
			}

			user = await prisma.user.update({
				where: {
					id: isPatientExistWithCredential.id,
				},
				data: {
					googleId: googleIdTokenPayload.sub,
				},
			});
		} else {
			//? actual google register here
			user = await prisma.user.create({
				data: {
					name: googleIdTokenPayload.name,
					email: googleIdTokenPayload.email,
					googleId: googleIdTokenPayload.sub,
					authProvider: AuthProvider.GOOGLE,
					emailVerified: true,
					patient: {
						create: {
							name: googleIdTokenPayload.name,
							email: googleIdTokenPayload.email,
						},
					},
				},
			});
		}
	}

	if (!user) {
		throw new Error("User Not Found.");
	}

	if (user.status === UserStatus.BLOCKED) {
		throw new Error("User is Blocked.");
	}

	if (user.isDeleted || user.status === UserStatus.DELETED) {
		throw new Error("User is Deleted.");
	}

	const jwtPayload = {
		userId: user?.id,
		name: user?.name,
		email: user?.email,
		role: user?.role,
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_access_secret,
		config.jwt_access_expires_in as SignOptions,
	);

	const refreshToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_refresh_secret,
		config.jwt_refresh_expires_in as SignOptions,
	);

	return {
		accessToken,
		refreshToken,
	};
};

const forgotPassword = async (payload: IForgotPasswordPayload) => {
	const { email } = payload;

	const isUserExists = await prisma.user.findUnique({
		where: {
			email,
		},
	});

	if (!isUserExists) {
		throw new Error("User not Found!");
	}

	if (isUserExists.status === UserStatus.BLOCKED) {
		throw new Error("User is Blocked!");
	}

	if (isUserExists.isDeleted || isUserExists.status === UserStatus.DELETED) {
		throw new Error("User is Deleted!");
	}

	if (isUserExists.authProvider !== AuthProvider.CREDENTIAL) {
		throw new Error("User Has Account With Google.");
	}

	// if(isUserExists.googleId && isUserExists.authProvider === AuthProvider.GOOGLE){
	// 	throw new Error("User Has Acoount With Google.")
	// }

	const otp = crypto.randomInt(100000, 1000000).toString();
	const key = `forgot-password-opt:${isUserExists.email}`;
	await redisClient.set(key, otp, {
		expiration: {
			type: "EX",
			value: 60 * 5,
		},
	});

	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/forgot-password-template.ejs",
	);
	const html = await ejs.renderFile(templatePath, {
		OTP: otp,
		name: isUserExists.name,
		expirationMinutes: 5,
	});

	const sender = config.smtp.sender
		? config.smtp.sender.includes("<")
			? config.smtp.sender
			: `"PH Healthcare" <${config.smtp.sender}>`
		: `"PH Healthcare" <${config.smtp.user}>`;

	await transporter.sendMail({
		from: sender,
		to: isUserExists.email,
		subject: "Your Password Reset OTP - PH Healthcare",
		text: `Hello ${isUserExists.name},\n\nYour OTP for resetting your PH Healthcare password is: ${otp}.\n\nThis verification code expires in 5 minutes.\n\nIf you did not request this password reset, please ignore this email.\n\nBest regards,\nPH Healthcare Team`,
		html: html,
	});
};

const resetPassword = async (payload: IResetPasswordPayload) => {
	const { email, otp, newPassword } = payload;

	const isUserExists = await prisma.user.findUnique({
		where: {
			email,
		},
	});

	if (!isUserExists) {
		throw new Error("User not Found!.");
	}

	if (isUserExists.status === UserStatus.BLOCKED) {
		throw new Error("User is Blocked!");
	}

	if (isUserExists.isDeleted || isUserExists.status === UserStatus.DELETED) {
		throw new Error("User is Deleted!");
	}

	if (isUserExists.authProvider !== AuthProvider.CREDENTIAL) {
		throw new Error("User Has Account With Google.");
	}

	const key = `forgot-password-opt:${isUserExists.email}`;
	const radisOtp = await redisClient.get(key);

	if (!radisOtp) {
		throw new Error("Invalid Opt.");
	}
	if (radisOtp !== otp) {
		throw new Error("OTP does not mathced.");
	}

	const hashedNewPassword = await bcrypt.hash(
		newPassword,
		Number(config.bcrypt_salt_rounds),
	);
	await prisma.user.update({
		where: {
			email: isUserExists.email,
		},
		data: {
			password: hashedNewPassword,
		},
	});

	await redisClient.del([key]);

	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/reset-password-success.ejs",
	);
	const loginUrl = `${config.frontend_url}/login`;
	const html = await ejs.renderFile(templatePath, {
		name: isUserExists.name,
		loginUrl,
	});

	const sender = config.smtp.sender
		? config.smtp.sender.includes("<")
			? config.smtp.sender
			: `"PH Healthcare" <${config.smtp.sender}>`
		: `"PH Healthcare" <${config.smtp.user}>`;

	await transporter.sendMail({
		from: sender,
		to: isUserExists.email,
		subject: "Password Reset Successful - PH Healthcare",
		text: `Hello ${isUserExists.name},\n\nYour password for your PH Healthcare account has been successfully reset.\n\nYou can now log in with your new password at: ${loginUrl}\n\nIf you did not perform this change, please contact our support team immediately at support@phhealthcare.com.\n\nBest regards,\nPH Healthcare Team`,
		html: html,
	});
};

export const AuthService = {
	registerPatient,
	loginUser,
	getMe,
	refreshToken,
	googleLogin,
	forgotPassword,
	resetPassword,
};
