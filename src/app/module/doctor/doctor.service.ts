import bcrypt from "bcryptjs";
import type { UploadApiResponse } from "cloudinary";
import crypto from "crypto";
import ejs from "ejs";
import httpStatus from "http-status";
import path from "path";
import {
	DoctorVerificationStatus,
	Role,
} from "../../../generated/prisma/enums";
import type { DoctorWhereInput } from "../../../generated/prisma/models";
import config from "../../config";
import cloudinary from "../../lib/cloudinary";
import transporter from "../../lib/nodeMailer";
import { prisma } from "../../lib/prisma";
import redisClient from "../../lib/redis";
import type { RequestUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import type {
	IApplyAsDoctorPayload,
	IApproveDoctorPayLoad,
	IQuery,
	VerifyDoctorEmail,
} from "./doctor.interface";

const applyAsDoctor = async (
	payLoad: IApplyAsDoctorPayload,
	resume: Express.Multer.File | null,
	additionalFiles: Express.Multer.File[],
) => {
	const email = payLoad.user.email;

	const isUserExist = await prisma.user.findUnique({
		where: {
			email: email,
		},
	});

	if (isUserExist) {
		throw new AppError(
			httpStatus.CONFLICT,
			"User with this email Already Exists.",
		);
	}

	//? uploading resume and additional files
	const resumeResult = await new Promise<UploadApiResponse>(
		(resolve, reject) => {
			cloudinary.uploader
				.upload_stream({ resource_type: "auto" }, async (error, result) => {
					if (error) {
						return reject(error);
					}
					if (result === undefined) {
						return reject(
							new AppError(
								httpStatus.INTERNAL_SERVER_ERROR,
								"No result returned from cloudinary.",
							),
						);
					}
					resolve(result);
				})
				.end(resume?.buffer);
		},
	);

	//? uploading the addtional file of the doctor
	const additionalFilesResult = await Promise.all(
		additionalFiles!.map((file) => {
			return new Promise<UploadApiResponse>((resolve, reject) => {
				cloudinary.uploader
					.upload_stream({ resource_type: "auto" }, async (error, result) => {
						if (error) {
							return reject(error);
						}
						if (result === undefined) {
							return reject(
								new AppError(
									httpStatus.INTERNAL_SERVER_ERROR,
									"No result returned from cloudinary.",
								),
							);
						}
						resolve(result);
					})
					.end(file?.buffer);
			});
		}),
	);

	const randomPassword = Math.random().toString(36).slice(-8);
	const hashedPassword = await bcrypt.hash(
		randomPassword,
		Number(config.bcrypt_salt_rounds),
	);

	//? creating the doctor model
	const doctorApplication = await prisma.user.create({
		data: {
			...payLoad.user,
			password: hashedPassword,
			role: Role.DOCTOR,
			needPasswordChange: true,
			doctor: {
				create: {
					name: payLoad.user.name,
					email: payLoad.user.email,
					...payLoad.doctor,
					resume: resumeResult.secure_url,
					resumePublicId: resumeResult.public_id,
					additionalFiles: additionalFilesResult.map((file) => ({
						url: file.secure_url,
						publicId: file.public_id,
					})),
				},
			},
		},
		include: {
			doctor: true,
		},
	});

	const optKey = `doctor-application-otp:${payLoad.user.email}`;
	const otpValue = crypto.randomInt(100000, 1000000).toString();
	const expirationSeconds = 60 * 60;

	await redisClient.set(optKey, otpValue, {
		expiration: {
			type: "EX",
			value: expirationSeconds,
		},
	});

	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/verify-doctor-email.ejs",
	);

	const templateData = {
		name: payLoad.user.name,
		email: payLoad.user.email,
		otp: otpValue,
		expirationMinutes: expirationSeconds / 60,
	};

	const html = await ejs.renderFile(templatePath, templateData);

	await transporter.sendMail({
		from: config.smtp.sender,
		to: payLoad.user.email,
		subject: "Doctor Application Mail Verification",
		html,
	});

	//? returning the doctor application
	return doctorApplication;
};

const verifyDoctorEmail = async (payLoad: VerifyDoctorEmail) => {
	const otp = payLoad.otp;
	const email = payLoad.email.trim().toLowerCase();

	const existingUser = await prisma.user.findUnique({
		where: {
			email: email,
			role: Role.DOCTOR,
		},
	});

	if (!existingUser) {
		throw new Error("Doctor Application Not Found.");
	}

	if (existingUser.emailVerified) {
		throw new Error("Email Already Verified.");
	}

	const optKey = `doctor-application-otp:${email}`;
	const redisOtp = await redisClient.get(optKey);

	//? if otp does not match with one another
	if (redisOtp !== otp) {
		throw new Error("Otp Does not Matched.Try Again");
	}

	//? when otp matched we will delete the redis otp and updated the user
	await redisClient.del(optKey);

	const updatedUser = await prisma.user.update({
		where: {
			email: email,
		},
		data: {
			emailVerified: true,
		},
		omit: {
			password: true,
		},
		include: {
			doctor: true,
		},
	});

	return updatedUser;
};

const approveDoctor = async (
	payLoad: IApproveDoctorPayLoad,
	reviewedBy: RequestUser,
) => {
	const { doctorId, verificationStatus, rejectionReason } = payLoad;

	const existingDoctor = await prisma.doctor.findUnique({
		where: {
			id: doctorId,
		},
		include: {
			user: {
				omit: {
					password: true,
				},
			},
		},
	});

	if (!existingDoctor) {
		throw new Error("Doctor Not Found.");
	}

	if (existingDoctor.isDeleted) {
		throw new Error("Doctor is Deleted.");
	}

	if (!existingDoctor.user.emailVerified) {
		throw new Error(
			"Doctor Email is not verified.Application can not be approved.",
		);
	}

	if (existingDoctor.verifactionStatus !== DoctorVerificationStatus.PENDING) {
		throw new Error(
			`Doctor Verification Status is Already Been ${existingDoctor.verifactionStatus.toLowerCase()}`,
		);
	}

	//? we can do this with zod validation also
	if (
		verificationStatus === DoctorVerificationStatus.REJECTED &&
		!rejectionReason
	) {
		throw new Error("Rejection Reason is Required.");
	}

	const updateDoctor = await prisma.doctor.update({
		where: {
			id: doctorId,
		},
		data: {
			verifactionStatus: verificationStatus,
			rejectionReason:
				verificationStatus === DoctorVerificationStatus.REJECTED
					? rejectionReason
					: null,
			reviewedBy: reviewedBy.userId,
			reviewedAt: new Date(),
		},
	});

	const isApproved = verificationStatus === DoctorVerificationStatus.APPROVED;

	// approve-doctor.ejs
	// reject-doctor.ejs
	const templatePath = path.join(
		process.cwd(),
		`src/app/templates/${
			isApproved ? "approve-doctor.ejs" : "reject-doctor.ejs"
		}`,
	);

	const templateData = {
		name: updateDoctor.name,
		reason: updateDoctor.rejectionReason,
	};

	const html = await ejs.renderFile(templatePath, templateData);

	await transporter.sendMail({
		sender: config.smtp.sender,
		to: updateDoctor.email,
		subject: isApproved
			? "Your Doctor Application Has been Approved"
			: "Your Doctor Application Has been Rejected",
		html,
	});

	return updateDoctor;
};

const getAllDoctors = async (query: IQuery) => {
	//? search , filter , sorting and pagination query
	const limit = query.limit ? Number(query.limit) : 10;
	const page = query.page ? Number(query.page) : 1;
	const skip = (page - 1) * limit;
	const sortBy = query.sortBy ? query.sortBy : "createdAt";
	const sortOrder = query.sortOrder ? query.sortOrder : "desc";

	const andCondtions: DoctorWhereInput[] = [];

	//? search term searching
	if (query.searchTerm) {
		andCondtions.push({
			OR: [
				{ name: { contains: query.searchTerm, mode: "insensitive" } },
				{ email: { contains: query.searchTerm, mode: "insensitive" } },
				{
					specialization: {
						contains: query.searchTerm,
						mode: "insensitive",
					},
				},
				{
					licesnseNumber: {
						contains: query.searchTerm,
						mode: "insensitive",
					},
				},
			],
		});
	}

	//? filtering with the email
	if (query.email) {
		andCondtions.push({
			email: { contains: query.email, mode: "insensitive" },
		});
	}

	if (query.specilization) {
		andCondtions.push({
			specialization: { contains: query.specilization, mode: "insensitive" },
		});
	}

	if (query.licenseNumber) {
		andCondtions.push({
			licesnseNumber: { contains: query.licenseNumber, mode: "insensitive" },
		});
	}

	if (query.verificationStatus) {
		andCondtions.push({
			verifactionStatus: query.verificationStatus as DoctorVerificationStatus,
		});
	}

	andCondtions.push({
		isDeleted: false,
	});

	const doctors = await prisma.doctor.findMany({
		where: {
			AND: andCondtions.length > 0 ? andCondtions : undefined,
		},
		take: limit,
		skip: skip,
		orderBy: {
			[sortBy]: sortOrder,
		},
		include: {
			user: {
				omit: {
					password: true,
				},
			},
			//? schedule  : true,
			//? appointments : true
			//? prescription : true
		},
	});

	const totalDoctorCount = await prisma.doctor.count({
		where: {
			AND: andCondtions,
		},
	});

	return {
		data: doctors,
		meta: {
			page: page,
			limit: limit,
			total: totalDoctorCount,
			totalPages: Math.ceil(totalDoctorCount / limit),
		},
	};
};

export const DoctorServices = {
	applyAsDoctor,
	verifyDoctorEmail,
	approveDoctor,
	getAllDoctors,
};
