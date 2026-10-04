import bcrypt from "bcryptjs";
import type { UploadApiResponse } from "cloudinary";
import { Role } from "../../../generated/prisma/enums";
import config from "../../config";
import cloudinary from "../../lib/cloudinary";
import { prisma } from "../../lib/prisma";
import type { IApplyAsDoctorPayload } from "./doctor.interface";

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
		throw new Error("User with this email Already Exists.");
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
						return reject(new Error("No result returned from cloudinary."));
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
							return reject(new Error("No result returned from cloudinary."));
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
      needPasswordChange : true,
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
    include : {
      doctor : true
    }
	});

	//? returning the doctor application
	return doctorApplication;
};

export const DoctorServices = {
	applyAsDoctor,
};
